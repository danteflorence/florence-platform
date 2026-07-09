import { seedIfEmpty } from '../server/seedData'
import { store } from '../server/db'

await seedIfEmpty()
console.log('[ats-connect] seed complete:', store.counts())
