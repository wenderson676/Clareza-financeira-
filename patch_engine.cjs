const fs = require('fs');
let code = fs.readFileSync('src/lib/financialEngine.ts', 'utf8');

const replacement = `  let bancoBal = 0;
  let reservaBal = 0;
  
  const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';

  allTxs.filter(t => !t.isPending).forEach(t => {
    const amt = t.amount;
    const act = t.account || 'banco';
    const toAct = t.toAccount;
    
    if (t.type === 'income') {
      if (isReserva(act)) reservaBal += amt; else bancoBal += amt;
    } else if (t.type === 'expense') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
    } else if (t.type === 'transfer_to_savings') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
      reservaBal += amt;
    } else if (t.type === 'transfer_from_savings') {
      reservaBal -= amt;
      bancoBal += amt;
    } else if (t.type === 'transfer_between_accounts') {
      if (isReserva(act)) reservaBal -= amt; else bancoBal -= amt;
      if (isReserva(toAct)) reservaBal += amt; else bancoBal += amt;
    }
  });`;

code = code.replace(/  let bancoBal = 0;[\s\S]*?    } else if \(t\.type === 'transfer_between_accounts' && act === 'reserva'\) \{\n      reservaBal -= amt;\n      bancoBal \+= amt;\n    \}\n  \}\);/g, replacement);

fs.writeFileSync('src/lib/financialEngine.ts', code);
console.log("REPLACED ENGINE");
