const { execSync } = require('child_process')
try {
  const out = execSync('npx tsc --noEmit 2>&1', { cwd: 'D:\\COURSES\\DTD\\ServerNodejs\\client', maxBuffer: 1024 * 1024 })
  console.log(out.toString())
} catch (e) {
  console.log(e.stdout?.toString() || e.message)
}
