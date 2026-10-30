import { mkdirSync } from 'node:fs'
import path from 'node:path'
import sqlite3 from 'sqlite3'
import type { AppState } from './types.js'

const dataDir = path.resolve(process.cwd(), 'data')
mkdirSync(dataDir, { recursive: true })

const dbFile = path.join(dataDir, 'smartdialer.sqlite')
const sqlite = sqlite3.verbose()
const db = new sqlite.Database(dbFile)

export async function initializeDatabase(): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.serialize(() => {
      db.run(
        `CREATE TABLE IF NOT EXISTS app_state (
          id INTEGER PRIMARY KEY,
          state_json TEXT NOT NULL
        )`,
        (error) => {
          if (error) {
            reject(error)
            return
          }

          db.get('SELECT state_json FROM app_state WHERE id = 1', (rowError: Error | null, row?: { state_json?: string }) => {
            if (rowError) {
              reject(rowError)
              return
            }

            if (!row) {
              db.run('INSERT INTO app_state (id, state_json) VALUES (1, ?)', JSON.stringify({}), (insertError) => {
                if (insertError) {
                  reject(insertError)
                  return
                }
                resolve()
              })
              return
            }

            resolve()
          })
        },
      )
    })
  })
}

export async function loadState(): Promise<AppState | null> {
  return new Promise((resolve, reject) => {
    db.get('SELECT state_json FROM app_state WHERE id = 1', (error: Error | null, row?: { state_json?: string }) => {
      if (error) {
        reject(error)
        return
      }

      if (!row) {
        resolve(null)
        return
      }

      try {
        resolve(JSON.parse(row.state_json ?? '{}') as AppState)
      } catch (parseError) {
        reject(parseError)
      }
    })
  })
}

export async function saveState(state: AppState): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    db.run('UPDATE app_state SET state_json = ? WHERE id = 1', JSON.stringify(state), (error) => {
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })
}
