import z from 'zod'

export const configSchema = z.object({
	PORT: z.coerce.number().int().min(1).max(65535).default(8080),
	VERSION: z.string().default('dev'),
})

export type Config = z.infer<typeof configSchema>
