import test from "node:test"
import assert from "node:assert/strict"
import {
  availableBatchesForProduct,
  calculateAmount,
  postSalesIssueInMemory,
  validateSalesIssueDraft,
} from "./salesIssueLogic.js"

const today = new Date("2026-07-25T00:00:00.000Z")

function state() {
  return {
    products: [
      {
        id: "P-ASH",
        name: "ASHINERO 10% ORAL",
        quantity: 1000,
        unitCost: 120,
        sellingPrice: 239,
        stockBreakdown: [{ warehouse: "WH1", qty: 1000 }],
        batches: [
          { batchNo: "ALL26041", qty: 1000, expiry: "2028-09-30", status: "Released" },
          { batchNo: "OLD25001", qty: 100, expiry: "2026-01-31", status: "Released" },
        ],
      },
    ],
    salesIssues: [
      {
        id: "SI-1",
        fs_no: "FS00000409",
        reference_no: "CRSI0000153",
        sale_date: "2026-07-18",
        customer_id: "CUST-1",
        customer_name: "SILANTE",
        warehouse_id: "WH1",
        payment_type: "Credit",
        status: "Draft",
      },
    ],
    salesIssueItems: [
      {
        id: "SII-1",
        sales_issue_id: "SI-1",
        item_id: "P-ASH",
        item_name: "ASHINERO 10% ORAL",
        batch_no: "ALL26041",
        quantity: 100,
        unit_price: 239,
      },
    ],
    stockMovements: [],
    customerReceivables: [],
  }
}

test("calculates sales issue amount with two decimal precision", () => {
  assert.equal(calculateAmount(1000, 239), 239000)
  assert.equal(calculateAmount(2.555, 10), 25.55)
})

test("filters expired batches and orders available batches by earliest expiry", () => {
  const batches = availableBatchesForProduct(state().products[0], "WH1", today)
  assert.deepEqual(batches.map((batch) => batch.batch_no), ["ALL26041"])
})

test("does not expose pending or quarantined batches for sales issue selection", () => {
  const current = state()
  current.products[0].batches.push(
    { batchNo: "QA26001", qty: 50, expiry: "2028-01-31", status: "Pending QA" },
    { batchNo: "HOLD26001", qty: 50, expiry: "2028-01-31", status: "Quarantined" },
  )
  const batches = availableBatchesForProduct(current.products[0], "WH1", today)
  assert.deepEqual(batches.map((batch) => batch.batch_no), ["ALL26041"])
})

test("validates quantity greater than zero", () => {
  const errors = validateSalesIssueDraft(state().salesIssues[0], [{ ...state().salesIssueItems[0], quantity: 0 }])
  assert.match(errors[0], /Quantity must be greater than zero/)
})

test("posting deducts stock, creates movement, receivable, and prevents duplicate posting", () => {
  const current = state()
  const posted = postSalesIssueInMemory(current, "SI-1", today)
  assert.equal(posted.status, "Posted")
  assert.equal(current.products[0].batches[0].qty, 900)
  assert.equal(current.products[0].stockBreakdown[0].qty, 900)
  assert.equal(current.stockMovements[0].type, "SALES_OUT")
  assert.equal(current.customerReceivables[0].balance, 23900)
  assert.throws(() => postSalesIssueInMemory(current, "SI-1", today), /already been posted/)
})

test("posting rejects quantity above available batch balance", () => {
  const current = state()
  current.salesIssueItems[0].quantity = 2000
  assert.throws(() => postSalesIssueInMemory(current, "SI-1", today), /exceeds available batch balance/)
})
