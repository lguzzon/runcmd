console.log('... Running runcmd in bun ...')
console.log('...   CWD: ', process.cwd())
console.log('...   ARGs: ', `\n...    ${process.argv.join('\n...    ')}`)
process.exit(10)
