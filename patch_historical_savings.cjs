const fs = require('fs');
let code = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');

const replacement = `            Object.values(allData).reduce((sum, month) => {
              return sum + month.transactions.reduce((mSum, t) => {
                if (t.isPending) return mSum;
                const act = t.account || 'banco';
                const toAct = t.toAccount;
                if (t.type === 'transfer_to_savings' || (t.type === 'expense' && t.bucket === 'Reserva/Dívidas') || (t.type === 'income' && isReserva(act)) || (t.type === 'transfer_between_accounts' && isReserva(toAct))) {
                  return mSum + t.amount;
                }
                if (t.type === 'transfer_from_savings' || (t.type === 'expense' && isReserva(act) && t.bucket !== 'Reserva/Dívidas') || (t.type === 'transfer_between_accounts' && isReserva(act))) {
                  return mSum - t.amount;
                }
                return mSum;
              }, 0);
            }, 0)`;

code = code.replace(/            Object\.values\(allData\)\.reduce\(\(sum, month\) => \{[\s\S]*?              \}, 0\);\n            \}, 0\)/g, replacement);

fs.writeFileSync('src/components/Dashboard.tsx', code);
console.log("REPLACED HISTORICAL SAVINGS");
