export default {
  id: 'huawei-cloud',
  name: 'Huawei Cloud Billing Statement',
  description: 'Extracts Huawei Cloud monthly billing statements into a structured Excel report',
  templatePath: new URL('./template.xlsx', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
  schema: {
    invoiceNumber: 'string',
    customerName: 'string',
    billingDate: 'string',
    currency: 'string',
    totalAmount: 'number',
    lineItems: [
      {
        serviceName: 'string',
        resourceId: 'string',
        usageAmount: 'string',
        unitPrice: 'number',
        totalCost: 'number',
      },
    ],
  },
  cellMap: {
    invoiceNumber: 'C4',
    customerName: 'C5',
    billingDate: 'C6',
    currency: 'C7',
    totalAmount: 'C8',
    lineItems: {
      startRow: 12,
      columns: {
        serviceName: 'A',
        resourceId: 'B',
        usageAmount: 'C',
        unitPrice: 'D',
        totalCost: 'E',
      },
    },
  },
};
