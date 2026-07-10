const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacement = `  const isReserva = (id?: string) => id === 'reserva' || accounts.find(a => a.id === id)?.type === 'reserva';

  const netTransfersToSavings = data.transactions
    .filter(t => !t.isPending)
    .reduce((sum, t) => {
      const act = t.account || 'banco';
      const toAct = t.toAccount;
      if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas') || (t.type === 'income' && isReserva(act)) || (t.type === 'transfer_between_accounts' && isReserva(toAct))) {
        return sum + t.amount;
      }
      if (t.type === 'transfer_from_savings' || (t.type === 'expense' && isReserva(act) && t.bucket !== 'Reserva/Dívidas') || (t.type === 'transfer_between_accounts' && isReserva(act))) {
        return sum - t.amount;
      }
      return sum;
    }, 0);`;

code = code.replace(/  const netTransfersToSavings = data\.transactions[\s\S]*?      return sum;\n    \}, 0\);/g, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("REPLACED TRANSFERS");
