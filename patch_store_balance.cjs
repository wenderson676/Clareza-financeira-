const fs = require('fs');
let code = fs.readFileSync('src/lib/store.ts', 'utf8');

const replacement = `  const getAccumulatedBalance = (targetMonthId: string): number => {
    let balance = 0;
    const targetDate = parse(targetMonthId, 'yyyy-MM', new Date());
    
    const isReserva = (id?: string) => id === 'reserva' || state.accounts?.find(a => a.id === id)?.type === 'reserva';

    Object.values(state.monthlyData).forEach((month: any) => {
      const monthDate = parse(month.monthId, 'yyyy-MM', new Date());
      if (monthDate < targetDate) {
        month.transactions.filter((t: any) => !t.isPending).forEach((t: any) => {
          const act = t.account || 'banco';
          const toAct = t.toAccount;
          if (t.type === 'income') {
            if (!isReserva(act)) balance += t.amount;
          } else if (t.type === 'expense') {
            if (!isReserva(act)) balance -= t.amount;
          } else if (t.type === 'transfer_to_savings' || (t.type === 'transfer_between_accounts' && isReserva(toAct))) {
            if (!isReserva(act)) balance -= t.amount;
          } else if (t.type === 'transfer_from_savings') {
            if (!isReserva(act)) balance += t.amount;
          } else if (t.type === 'transfer_between_accounts' && isReserva(act) && !isReserva(toAct)) {
            balance += t.amount;
          }
        });
      }
    });
    return balance;
  };`;

code = code.replace(/  const getAccumulatedBalance = \(targetMonthId: string\): number => \{[\s\S]*?    return balance;\n  \};/g, replacement);

fs.writeFileSync('src/lib/store.ts', code);
console.log("REPLACED STORE BALANCE");
