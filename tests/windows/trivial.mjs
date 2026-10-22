// Trivial target for the Windows CI smoke test: prints the arguments it
// received and exits 0, so the job can assert that runcmd.bat forwards them.
console.log('trivial target: args: ' + process.argv.slice(2).join(' '))
