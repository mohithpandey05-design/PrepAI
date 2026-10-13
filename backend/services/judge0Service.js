const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');

const LANGUAGE_MAP = {
  'cpp': 54,
  'java': 62,
  'python': 71,
  'javascript': 63
};

function validateLanguageSyntax(language, code) {
  if (!code || typeof code !== 'string') {
    return { valid: false, message: 'Empty or invalid source code submitted.' };
  }

  const trimmed = code.trim();

  if (language === 'cpp') {
    const isJavaOrCpp = trimmed.includes('#include') || trimmed.includes('int main') || trimmed.includes('std::cout') || trimmed.includes('using namespace');
    const isPython = !isJavaOrCpp && (
      /^\s*def\s+[a-zA-Z_]/m.test(trimmed) ||
      /^\s*from\s+[a-zA-Z_]+.*import/m.test(trimmed) ||
      (trimmed.includes('print(') && !trimmed.includes('cout'))
    );
    if (isPython) {
      return {
        valid: false,
        message: 'Compilation Error: Submitted code contains Python syntax but selected language is C++.'
      };
    }
  }

  if (language === 'python') {
    const isCppOrJava = (
      trimmed.includes('#include <') ||
      trimmed.includes('public class ') ||
      trimmed.includes('std::cout') ||
      trimmed.includes('int main(') ||
      trimmed.includes('System.out.print')
    );
    if (isCppOrJava) {
      return {
        valid: false,
        message: 'Compilation Error: Submitted code contains C++/Java syntax but selected language is Python.'
      };
    }
  }

  if (language === 'java') {
    const isJava = trimmed.includes('class ') || trimmed.includes('System.out') || trimmed.includes('public static void main') || trimmed.includes('import java.');
    const isPython = !isJava && (
      /^\s*def\s+[a-zA-Z_]/m.test(trimmed) ||
      /^\s*from\s+[a-zA-Z_]+.*import/m.test(trimmed) ||
      trimmed.includes('print(')
    );
    if (isPython) {
      return {
        valid: false,
        message: 'Compilation Error: Submitted code contains Python syntax but selected language is Java.'
      };
    }
  }

  if (language === 'javascript') {
    const isCppOrJava = (
      trimmed.includes('#include <') ||
      trimmed.includes('public class ') ||
      trimmed.includes('std::cout')
    );
    if (isCppOrJava) {
      return {
        valid: false,
        message: 'Compilation Error: Submitted code contains C++/Java syntax but selected language is JavaScript.'
      };
    }
  }

  return { valid: true };
}

const executeCode = async (language, code, input = '') => {
  const syntaxCheck = validateLanguageSyntax(language, code);
  if (!syntaxCheck.valid) {
    return {
      stdout: null,
      stderr: syntaxCheck.message,
      compile_output: syntaxCheck.message,
      status: 'Compilation Error'
    };
  }

  const apiKey = process.env.JUDGE0_API_KEY;
  const isPlaceholderKey = !apiKey || apiKey.includes('your_') || apiKey.length < 10;

  if (isPlaceholderKey) {
    return runLocalCodeExecution(language, code, input);
  }

  const languageId = LANGUAGE_MAP[language];
  console.log('[CODING] Language:', language);
  console.log('[CODING] Judge0 language ID:', languageId);
  console.log('[CODING] Input:', JSON.stringify(input));

  if (!languageId) return runLocalCodeExecution(language, code, input);

  let host = "";
  try { host = new URL(process.env.JUDGE0_API_URL).host; } catch(e){}

  const options = {
    method: 'POST',
    url: `${process.env.JUDGE0_API_URL}/submissions`,
    params: { base64_encoded: 'true', wait: 'true' },
    headers: {
      'content-type': 'application/json',
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': host
    },
    data: {
      language_id: languageId,
      source_code: Buffer.from(code).toString('base64'),
      stdin: input ? Buffer.from(input).toString('base64') : undefined
    }
  };

  try {
    const response = await axios.request(options);
    const data = response.data;

    const stdout = data.stdout ? Buffer.from(data.stdout, 'base64').toString('utf-8') : null;
    const stderr = data.stderr ? Buffer.from(data.stderr, 'base64').toString('utf-8') : null;
    const compileOutput = data.compile_output ? Buffer.from(data.compile_output, 'base64').toString('utf-8') : null;

    let status = "Accepted";
    if (data.status) {
      if (data.status.id === 3) status = "Accepted";
      else if (data.status.id === 4) status = "Wrong Answer";
      else if (data.status.id === 5) status = "Time Limit Exceeded";
      else if (data.status.id === 6) status = "Compilation Error";
      else status = "Runtime Error";
    }

    return {
      stdout,
      stderr,
      compile_output: compileOutput,
      status
    };
  } catch (error) {
    console.warn("⚠️ Remote Judge0 API failed. Falling back to local execution engine:", error.message);
    return runLocalCodeExecution(language, code, input);
  }
};

function runLocalCodeExecution(language, code, input = '') {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prepai_code_'));

  try {
    const inputFilePath = path.join(tmpDir, 'input.txt');
    fs.writeFileSync(inputFilePath, input || '', 'utf-8');

    if (language === 'python') {
      const codeFilePath = path.join(tmpDir, 'solution.py');
      fs.writeFileSync(codeFilePath, code, 'utf-8');

      const res = spawnSync('python', [codeFilePath], {
        input: input || '',
        encoding: 'utf-8',
        timeout: 4000
      });

      if (res.error && res.error.code === 'ETIMEDOUT') {
        return { stdout: null, stderr: 'Execution timed out (Limit 4s)', compile_output: null, status: 'Time Limit Exceeded' };
      }

      if (res.status !== 0) {
        const errText = res.stderr || res.stdout || 'Python Runtime Exception';
        const isSyntax = errText.includes('SyntaxError') || errText.includes('IndentationError');
        return {
          stdout: res.stdout || null,
          stderr: errText,
          compile_output: isSyntax ? errText : null,
          status: isSyntax ? 'Compilation Error' : 'Runtime Error'
        };
      }

      return { stdout: res.stdout || '', stderr: null, compile_output: null, status: 'Accepted' };
    }

    if (language === 'cpp') {
      const codeFilePath = path.join(tmpDir, 'main.cpp');
      const exeFilePath = path.join(tmpDir, process.platform === 'win32' ? 'main.exe' : 'main');
      fs.writeFileSync(codeFilePath, code, 'utf-8');

      const compileRes = spawnSync('g++', ['-O2', codeFilePath, '-o', exeFilePath], {
        encoding: 'utf-8',
        timeout: 8000
      });

      if (compileRes.status !== 0 || compileRes.error) {
        const compileErr = compileRes.stderr || compileRes.stdout || 'Compilation failed';
        return {
          stdout: null,
          stderr: compileErr,
          compile_output: compileErr,
          status: 'Compilation Error'
        };
      }

      const execRes = spawnSync(exeFilePath, [], {
        input: input || '',
        encoding: 'utf-8',
        timeout: 4000
      });

      if (execRes.error && execRes.error.code === 'ETIMEDOUT') {
        return { stdout: null, stderr: 'Time Limit Exceeded (Limit 4s)', compile_output: null, status: 'Time Limit Exceeded' };
      }

      if (execRes.status !== 0) {
        return { stdout: execRes.stdout || null, stderr: execRes.stderr || 'Runtime Error', compile_output: null, status: 'Runtime Error' };
      }

      return { stdout: execRes.stdout || '', stderr: null, compile_output: null, status: 'Accepted' };
    }

    if (language === 'javascript') {
      const codeFilePath = path.join(tmpDir, 'solution.js');
      fs.writeFileSync(codeFilePath, code, 'utf-8');

      const res = spawnSync('node', [codeFilePath], {
        input: input || '',
        encoding: 'utf-8',
        timeout: 4000
      });

      if (res.error && res.error.code === 'ETIMEDOUT') {
        return { stdout: null, stderr: 'Execution timed out', compile_output: null, status: 'Time Limit Exceeded' };
      }

      if (res.status !== 0) {
        const errText = res.stderr || 'JavaScript Runtime Error';
        const isSyntax = errText.includes('SyntaxError');
        return {
          stdout: res.stdout || null,
          stderr: errText,
          compile_output: isSyntax ? errText : null,
          status: isSyntax ? 'Compilation Error' : 'Runtime Error'
        };
      }

      return { stdout: res.stdout || '', stderr: null, compile_output: null, status: 'Accepted' };
    }

    if (language === 'java') {
      const codeFilePath = path.join(tmpDir, 'Main.java');
      fs.writeFileSync(codeFilePath, code, 'utf-8');

      const compileRes = spawnSync('javac', [codeFilePath], {
        encoding: 'utf-8',
        timeout: 8000
      });

      if (compileRes.status !== 0) {
        const compileErr = compileRes.stderr || 'Java Compilation Error';
        return { stdout: null, stderr: compileErr, compile_output: compileErr, status: 'Compilation Error' };
      }

      const execRes = spawnSync('java', ['-cp', tmpDir, 'Main'], {
        input: input || '',
        encoding: 'utf-8',
        timeout: 4000
      });

      if (execRes.status !== 0) {
        return { stdout: execRes.stdout || null, stderr: execRes.stderr || 'Java Runtime Error', compile_output: null, status: 'Runtime Error' };
      }

      return { stdout: execRes.stdout || '', stderr: null, compile_output: null, status: 'Accepted' };
    }

    return { stdout: 'Unsupported language', stderr: null, compile_output: null, status: 'Runtime Error' };

  } catch (err) {
    return { stdout: null, stderr: err.message, compile_output: err.message, status: 'Runtime Error' };
  } finally {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) {}
  }
}

module.exports = {
  executeCode,
  validateLanguageSyntax
};
