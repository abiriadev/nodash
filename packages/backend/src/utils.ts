import { zipWith } from 'es-toolkit'
import { z } from 'zod'

export const isoDatetimeToDate = z.codec(z.iso.datetime(), z.date(), {
	decode: isoString => new Date(isoString),
	encode: date => date.toISOString(),
})

// SQL syntax highlight helper method.
// It actually does nothing.
export const sql = (q: TemplateStringsArray, ...values: string[]) =>
	zipWith(q, values, (a, b) => a + (b ?? '')).join('')
