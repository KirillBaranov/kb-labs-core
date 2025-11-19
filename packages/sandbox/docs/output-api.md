# Output API для плагинов

## Доступ к Output

В CLI handlers Output доступен через `ctx.output`:

```typescript
import type { CliHandlerContext } from '@kb-labs/sandbox';

export async function run(ctx: CliHandlerContext) {
  const { output } = ctx;
  // Используйте output для вывода
}
```

## Основные методы

### success(message, data?)

Вывод успешного результата:

```typescript
output.success('Command completed', {
  filesProcessed: 42,
  duration: 1234,
});
```

### error(error, options?)

Вывод ошибки с форматированием:

```typescript
output.error(error, {
  title: 'Operation failed',
  code: 'E_OPERATION_FAILED',
  suggestions: [
    'Check permissions',
    'Verify configuration',
  ],
  docs: 'https://kb-labs.dev/docs/errors/E_OPERATION_FAILED',
  context: {
    file: 'config.json',
    line: 42,
  },
});
```

### warn(message, hint?)

Предупреждение:

```typescript
output.warn('Deprecated feature used', 'Use new API instead');
```

### info(message, meta?)

Информационное сообщение (только с --verbose):

```typescript
output.info('Processing files', { count: 10 });
```

### debug(message, meta?)

Debug информация (только с --debug):

```typescript
output.debug('Internal state', { state: currentState });
```

### trace(message, meta?)

Trace информация (только с --debug=inspect):

```typescript
output.trace('Detailed trace', { step: 'validation' });
```

### progress(stage, details?)

Прогресс операции:

```typescript
output.progress('Processing files', {
  current: 5,
  total: 10,
  message: 'File 5 of 10',
});
```

### spinner(text)

Создать spinner:

```typescript
const spinner = output.spinner('Loading...');
spinner.start();

try {
  await doWork();
  spinner.succeed('Done');
} catch (error) {
  spinner.fail('Failed');
}
```

### json(data)

JSON вывод (при --json флаге):

```typescript
output.json({ ok: true, data: result });
```

### write(text)

Raw вывод текста:

```typescript
output.write('Custom formatted text');
```

## UI утилиты

Доступны через `output.ui`:

```typescript
const { ui } = output;

// Box
const boxed = ui.box('Title', ['Line 1', 'Line 2']);
output.write(boxed);

// Table
const table = ui.table(
  [['Col1', 'Col2'], ['Val1', 'Val2']],
  ['Header1', 'Header2']
);
output.write(table.join('\n'));

// Key-Value
const kv = ui.keyValue({ Key: 'Value', Count: 42 });
output.write(kv.join('\n'));

// Spinner
const spinner = ui.spinner('Loading...');

// Colors
output.write(ui.colors.success('Success'));
output.write(ui.colors.error('Error'));
output.write(ui.colors.muted('Muted text'));

// Symbols
output.write(`${ui.symbols.success} Done`);
output.write(`${ui.symbols.error} Failed`);
```

## Примеры

### Простой успешный результат

```typescript
export async function run(ctx: CliHandlerContext) {
  const result = await doWork();
  
  ctx.output.success('Query completed', {
    chunks: result.chunks.length,
    duration: result.duration,
  });
  
  return 0;
}
```

### Ошибка с suggestions

```typescript
export async function run(ctx: CliHandlerContext) {
  try {
    await doWork();
  } catch (error) {
    ctx.output.error(error, {
      title: 'Indexing failed',
      code: 'E_INDEX_FAILED',
      suggestions: [
        'Check that files are readable',
        'Verify Mind is initialized',
        'Try: kb mind init',
      ],
      docs: 'https://kb-labs.dev/docs/mind/indexing',
    });
    return 1;
  }
  
  return 0;
}
```

### Прогресс длительной операции

```typescript
export async function run(ctx: CliHandlerContext) {
  const spinner = ctx.output.spinner('Indexing project...');
  spinner.start();
  
  const files = await getFiles();
  
  for (let i = 0; i < files.length; i++) {
    ctx.output.progress('Processing files', {
      current: i + 1,
      total: files.length,
      message: files[i],
    });
    
    await processFile(files[i]);
  }
  
  spinner.succeed('Indexing completed');
  return 0;
}
```

### Использование UI утилит

```typescript
export async function run(ctx: CliHandlerContext) {
  const { ui } = ctx.output;
  
  const stats = await collectStats();
  
  const summary = ui.keyValue({
    'Files processed': stats.files,
    'Duration': formatDuration(stats.duration),
    'Size': formatSize(stats.size),
  });
  
  const output = ui.box('Summary', summary);
  ctx.output.write(output);
  
  return 0;
}
```

### Debug информация

```typescript
export async function run(ctx: CliHandlerContext) {
  ctx.output.debug('Starting vector search', {
    scopeId: 'default',
    queryText: 'example',
  });
  
  const results = await vectorSearch(query);
  
  ctx.output.debug('Vector search completed', {
    results: results.length,
    duration: timer.elapsed(),
  });
  
  return 0;
}
```

## Обратная совместимость

`ctx.presenter` остается доступным для обратной совместимости:

```typescript
// Старый код продолжает работать
ctx.presenter.info('Message');
ctx.presenter.error('Error');

// Но рекомендуется использовать
ctx.output.info('Message');
ctx.output.error('Error');
```


