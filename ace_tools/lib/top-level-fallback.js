/*
 * Copyright (c) 2026 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Last-resort CLI error guard.
 *
 * Node's default uncaught handler prints the thrown source line; the deployed
 * bundle is minified into very long lines, so one preview can dump much of the
 * CLI source. This guard prints the normal stack (file:line only) and exits 1.
 *
 * It is CLI-only and idempotent. The same file is used by the source entry and
 * injected as the rollup banner, so the bundled startup path is covered too.
 */
(function () {
  const isCli =
    (typeof globalThis !== 'undefined' && globalThis.__ACE_TOP_LEVEL_IS_CLI__ === true) ||
    (typeof require !== 'undefined' &&
      typeof module !== 'undefined' &&
      require.main === module);

  if (!isCli) {
    return;
  }
  if (globalThis.__ACE_TOP_LEVEL_FALLBACK_INSTALLED__) {
    return;
  }
  globalThis.__ACE_TOP_LEVEL_FALLBACK_INSTALLED__ = true;

  // Cap the printed text so a pathological error cannot flood stderr.
  const MAX_ERROR_TEXT_LENGTH = 32768;
  // Force exit if stderr never invokes the write callback.
  const STDERR_FLUSH_TIMEOUT_MS = 1000;

  const handleFatalError = (err) => {
    let text = err && err.stack
      ? err.stack
      : (err && err.message ? err.message : String(err));
    if (text.length > MAX_ERROR_TEXT_LENGTH) {
      text = text.slice(0, MAX_ERROR_TEXT_LENGTH) + '\n...[truncated]';
    }

    const color = process.stderr.isTTY;
    const out = color ? `\x1B[31m${text}\x1B[0m` : text;
    process.exitCode = 1;

    const done = () => process.exit(1);
    try {
      // Queue after existing stderr writes; the timer is a fallback in case
      // the stream never invokes the callback.
      process.stderr.write(out + '\n', done);
      const timer = setTimeout(done, STDERR_FLUSH_TIMEOUT_MS);
      if (timer.unref) {
        timer.unref();
      }
    } catch (e) {
      done();
    }
  };

  process.on('uncaughtException', handleFatalError);
  process.on('unhandledRejection', handleFatalError);
})();