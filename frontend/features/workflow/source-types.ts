/** Both source nodes share workbook identity, reading forms and presentation containers. */
export const isExcelSourceType = (type: string) => type === "excel_source" || type === "excel_periods";
