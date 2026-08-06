import {
  cancelSalesIssue,
  createSalesIssue,
  deleteSalesIssue,
  getAvailableBatches,
  getSalesIssue,
  listSalesIssues,
  postSalesIssue,
} from "./salesIssues.js"

export const salesService = {
  list: listSalesIssues,
  get: getSalesIssue,
  create: createSalesIssue,
  update: (body, id) => createSalesIssue(body, id),
  delete: deleteSalesIssue,
  post: postSalesIssue,
  cancel: cancelSalesIssue,
  getBatches: getAvailableBatches,
}
