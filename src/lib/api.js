import { supabase } from './supabase'

export async function callAdminApi(fnName, body) {
  const { data, error } = await supabase.functions.invoke(fnName, { body })
  if (error) throw new Error(error.message)
  if (!data?.success) {
    throw Object.assign(
      new Error(data?.error?.message ?? 'Unknown error'),
      { code: data?.error?.code },
    )
  }
  return data.data
}
