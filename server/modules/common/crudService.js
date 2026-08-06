import { createRow, deleteRow, getRow, listRows, replaceRows, updateRow } from "../../db/supabaseClient.js"

export const crudService = {
  async list({ resource, query, headers }) {
    return await listRows({ resource, query, headers })
  },
  async get({ resource, id, query, headers }) {
    return await getRow({ resource, id, query, headers })
  },
  async create({ resource, body, headers }) {
    return await createRow({ resource, body, headers })
  },
  async update({ resource, id, body, headers }) {
    return await updateRow({ resource, id, body, headers })
  },
  async delete({ resource, id, headers }) {
    return await deleteRow({ resource, id, headers })
  },
  async replace({ resource, body, headers }) {
    return await replaceRows({ resource, body, headers })
  },
}
