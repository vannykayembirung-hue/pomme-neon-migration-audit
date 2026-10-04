export type SkillContext = {
  now: Date
  flags: { orphanCapture: boolean }
  readJson<T>(file: string, fallback: T): Promise<T>
  writeText(file: string, content: string): Promise<void>
  listFiles(dir: string): Promise<{ name: string; bytes: number }[]>
  sendToFounder?(subject: string, text: string): Promise<boolean>
}

export type SkillResult = { ok: boolean; summary: string; data?: unknown }

export type Skill = {
  name: string
  description: string
  run(context: SkillContext): Promise<SkillResult>
}

export async function safeRun(skill: Skill, context: SkillContext): Promise<SkillResult> {
  try {
    return await skill.run(context)
  } catch (error) {
    return { ok: false, summary: `${skill.name} failed: ${error instanceof Error ? error.message : 'unknown error'}` }
  }
}
