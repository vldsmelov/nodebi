"""Restore one editable demonstration project through the Node BI owner API."""
from argparse import ArgumentParser
from copy import deepcopy
from getpass import getpass
from hashlib import sha256
from http.client import HTTPSConnection
from http.cookiejar import CookieJar
import json
from pathlib import Path
import re
import socket
import ssl
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPCookieProcessor, HTTPRedirectHandler, HTTPSHandler, ProxyHandler, Request, build_opener
from uuid import UUID, uuid4, uuid5

from native_tables import csv_bytes, tables

FORMAT = "nodebi-native-report-v1"


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class LocalhostConnection(HTTPSConnection):
    def connect(self):
        def connect_loopback(address, timeout, source_address=None):
            return socket.create_connection(("127.0.0.1", address[1]), timeout, source_address)
        self._create_connection = connect_loopback
        super().connect()


class LocalhostHandler(HTTPSHandler):
    def https_open(self, request):
        return self.do_open(LocalhostConnection, request, context=self._context)


class Api:
    def __init__(self, origin, ca_file):
        parsed = urlsplit(origin)
        if (parsed.scheme != "https" or not parsed.hostname or parsed.username is not None
                or parsed.password is not None or parsed.path or parsed.query or parsed.fragment):
            raise ValueError("Provide the HTTPS origin without a path or credentials")
        self.origin = origin
        self.csrf = None
        tls = ssl.create_default_context(cafile=str(ca_file) if ca_file else None)
        handler = LocalhostHandler if parsed.hostname == "localhost" else HTTPSHandler
        self.opener = build_opener(ProxyHandler({}), NoRedirect(), handler(context=tls), HTTPCookieProcessor(CookieJar()))

    def call(self, path, payload=None, method=None, content_type="application/json"):
        data = payload if isinstance(payload, bytes) else json.dumps(payload).encode() if payload is not None else None
        headers = {"Origin": self.origin, "Content-Type": content_type}
        if self.csrf:
            headers["X-CSRF-Token"] = self.csrf
        route = self.origin + "/api/v1" + path
        try:
            with self.opener.open(Request(route, data=data, headers=headers, method=method), timeout=65) as response:
                body = response.read(8 * 1024**2 + 1)
                if len(body) > 8 * 1024**2:
                    raise ValueError("API response exceeded limit")
                return json.loads(body) if body else None
        except HTTPError as error:
            try:
                detail = json.loads(error.read(65536)).get("detail")
            except ValueError:
                detail = None
            code = detail.get("code") if isinstance(detail, dict) else None
            if error.code == 409 and code == "EXECUTION_PENDING":
                return {"pending": str(UUID(detail["execution_id"]))}
            location = [row.get("loc", []) for row in detail] if isinstance(detail, list) else []
            raise RuntimeError(f"{method or 'API'} {path}: HTTP {error.code} {code or location or ''}") from None

    def sign_in(self, username, password):
        session = self.call("/auth/login", {"username": username, "password": password})
        if session.get("must_change_password"):
            raise RuntimeError("Change the owner password in Node BI before restoring a project.")
        self.csrf = session["csrf_token"]

    def wait(self, identity, workflow=False):
        route = ("/workflow-executions/" if workflow else "/executions/") + str(UUID(identity))
        deadline = time.monotonic() + 600
        while time.monotonic() < deadline:
            result = self.call(route)
            status = result["status"]
            if status == "succeeded":
                return result
            if status not in {"queued", "running"}:
                raise RuntimeError(f"Job {identity} finished as {status}: {result.get('error_code')}")
            time.sleep(0.5)
        raise TimeoutError(f"Job {identity} is still running. Resume with the same state file.")

    def upload(self, project_route, table, data):
        boundary = uuid4().hex
        header = (
            f'--{boundary}\r\nContent-Disposition: form-data; name="connector"\r\n\r\ncsv\r\n'
            f'--{boundary}\r\nContent-Disposition: form-data; name="file"; filename="consolidation-{table}.csv"\r\n'
            'Content-Type: text/csv\r\n\r\n'
        ).encode()
        return self.call(project_route + "/imports", header + data + f"\r\n--{boundary}--\r\n".encode(),
                         content_type="multipart/form-data; boundary=" + boundary)


class Restore:
    def __init__(self, api, bundle, path, digest):
        self.api = api
        self.bundle = bundle
        self.path = path
        self.state = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {"origin": api.origin, "package": digest, "objects": {}}
        if self.state["origin"] != api.origin or self.state["package"] != digest:
            raise ValueError("The state file is for another deployment or package")

    def save(self):
        temporary = self.path.with_suffix(self.path.suffix + ".tmp")
        temporary.write_text(json.dumps(self.state, ensure_ascii=False), encoding="utf-8")
        temporary.replace(self.path)

    def remember(self, key, operation):
        if key not in self.state["objects"]:
            self.state["objects"][key] = operation()
            self.save()
            print(key, flush=True)
        return self.state["objects"][key]

    def restore(self):
        bundle, api = self.bundle, self.api
        data = tables(bundle)

        def create_project():
            if any(project["name"] == bundle["project_name"] for project in api.call("/projects")["items"]):
                raise RuntimeError("A project with this name exists. Resume with its original state file.")
            return api.call("/projects", {"name": bundle["project_name"]})

        project = self.remember("project", create_project)
        identity = UUID(project["id"])
        root = f"/projects/{identity}"
        if api.call(root)["name"] != bundle["project_name"]:
            raise RuntimeError("The restored project name was changed")
        parameters = bundle["dashboard"]["parameters"]
        flag_fields = [(item["name"], item["label"] + " · выбор", "boolean") for item in parameters]
        sources = {}
        for key in ("monthly", "summary", "detail"):
            spec = bundle["tables"][key]
            fields = flag_fields + spec["fields"]
            source = self.remember("source:" + key, lambda: api.upload(root, key, csv_bytes(fields, data[key])))
            source_id = str(UUID(source["id"]))
            if source.get("discovery_execution_id"):
                api.wait(source["discovery_execution_id"])
            current = api.call(f"{root}/imports/{source_id}/session")["source"]
            resources = current["resources"]
            if len(resources) != 1:
                raise RuntimeError("CSV import did not produce one table")
            resource_id = resources[0]["id"]
            profile = {"resource_id": resource_id, "name": spec["resource"], "fields": [
                {"field_id": column, "source_field": f"col_{index}", "name": label, "logical_type": kind,
                 "nullable": kind == "decimal", **({"precision": 38, "scale": 2} if kind == "decimal" else {})}
                for index, (column, label, kind) in enumerate(fields, 1)
            ]}
            job = self.remember("normalize:" + key, lambda: api.call(f"/imports/{source_id}/executions", {
                "profile": profile, "expected_revision": current["revision"], "request_id": str(uuid5(identity, "import:" + key)),
            }))
            api.wait(job["id"])
            sources[spec["resource"]] = (source_id, resource_id)

        identifiers = {}
        for graph in bundle["workflows"].values():
            for item in [*graph["nodes"], *graph["edges"], *graph["result_catalog"]["outputs"]]:
                old = UUID(item["id"])
                new = uuid5(identity, str(old))
                identifiers[str(old)] = str(new)
                identifiers[old.hex] = new.hex
        pattern = re.compile("|".join(re.escape(key) for key in sorted(identifiers, key=len, reverse=True)))

        def rekey(value):
            if isinstance(value, str):
                return pattern.sub(lambda match: identifiers[match[0]], value)
            if isinstance(value, list):
                return [rekey(item) for item in value]
            if isinstance(value, dict):
                return {rekey(key): rekey(item) for key, item in value.items()}
            return value

        restored = {}
        for key, graph in bundle["workflows"].items():
            workflow = self.remember("workflow:" + key, lambda: api.call(root + "/workflows", {"name": graph["name"]}))
            path = "/workflows/" + str(UUID(workflow["id"]))
            payload = rekey(graph)
            for node in payload["nodes"]:
                if node["type"] == "dataset_source":
                    settings = node["config"]
                    settings["source_id"], settings["resource_id"] = sources[settings["resource_id"]]
            def save_graph():
                current = api.call(path)
                if current["nodes"]:
                    raise RuntimeError("Existing workflow differs from an empty restore target")
                return api.call(path, {**payload, "expected_revision": current["revision"]}, method="PUT")
            restored[key] = self.remember("graph:" + key, save_graph)

        visuals = {}
        for key, visual in bundle["visualizations"].items():
            payload = rekey({name: prop for name, prop in visual.items() if name != "workflow"})
            graph = restored[visual["workflow"]]
            def submit():
                return api.call(root + "/visualizations", {**payload, "workflow_id": graph["id"],
                    "expected_workflow_revision": graph["revision"], "request_id": str(uuid5(identity, "visual:" + key))})
            response = self.remember("request:" + key, submit)
            if "pending" in response:
                execution = response["pending"]
                def result():
                    api.wait(execution, workflow=True)
                    return api.call(root + "/visualizations/saves/" + execution)
                visuals[key] = self.remember("visual:" + key, result)
            else:
                visuals[key] = response

        spec = bundle["dashboard"]
        board = self.remember("board", lambda: api.call(root + "/dashboards", {"name": spec["name"]}))
        board_id = str(UUID(board["id"]))
        path = "/dashboards/" + board_id
        parameters = deepcopy(parameters)
        config = {"parameters": parameters, "bindings": [
            {"workflow_id": graph["id"], "workflow_parameter": item["name"], "dashboard_parameter": item["name"]}
            for graph in restored.values() for item in parameters
        ], "links": [{"label": "Все ДО", "action": {"dashboard_id": board_id}}]}
        for item in parameters:
            config["links"].append({"label": item["label"], "action": {"dashboard_id": board_id, "values": {
                item["name"]: {"source": "constant", "value": True},
            }}})
        widgets = [{**{name: value for name, value in row.items() if name != "visualization"},
                    "id": str(uuid5(UUID(board_id), row["visualization"])), "visualization_id": visuals[row["visualization"]]["id"]}
                   for row in spec["widgets"]]
        def save_board():
            current = api.call(path)
            if current["widgets"]:
                raise RuntimeError("Existing dashboard differs from an empty restore target")
            return api.call(path, {"name": spec["name"], "widgets": widgets,
                                   "configuration": config, "expected_revision": current["revision"]}, method="PUT")
        self.remember("published", save_board)
        self.state["url"] = f"{api.origin}{root}/dashboard?dashboard={board_id}&mode=view"
        self.save()
        print(self.state["url"], flush=True)


def main():
    parser = ArgumentParser(description=__doc__)
    parser.add_argument("package", type=Path)
    parser.add_argument("--origin", required=True)
    parser.add_argument("--state", required=True, type=Path)
    parser.add_argument("--username", default="nodebi")
    parser.add_argument("--ca-file", type=Path)
    parser.add_argument("--password-file", type=Path)
    args = parser.parse_args()
    with args.package.open("rb") as input_file:
        raw = input_file.read(1024 * 1024 + 1)
    if len(raw) > 1024 * 1024:
        parser.error("Native project package is too large")
    bundle = json.loads(raw)
    if bundle.get("format") != FORMAT:
        parser.error("Expected a native report package")
    api = Api(args.origin.rstrip("/"), args.ca_file)
    restore = Restore(api, bundle, args.state, sha256(raw).hexdigest())
    password = args.password_file.read_text(encoding="utf-8").strip() if args.password_file else getpass("Node BI owner password: ")
    api.sign_in(args.username, password)
    del password
    try:
        restore.restore()
    finally:
        api.call("/auth/logout", {})


if __name__ == "__main__":
    main()
