import { seedIfEmpty } from '../server/seedData'

if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SYNTHETIC_SEED !== '1') {
  throw new Error('Refusing to seed synthetic Pathway demo data in production without ALLOW_SYNTHETIC_SEED=1.')
}

await seedIfEmpty()
