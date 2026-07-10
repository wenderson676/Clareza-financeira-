const recurrences = [ { type: 'income', averageAmount: 5000 }, { type: 'expense', averageAmount: 2000 } ];
const adjustedIncome = 5000;
const adjustedExpenses = 3000;
const totalDebtMonthly = 500;
const globalCommitments = [];

let pIncome = recurrences.filter(r => r.type === 'income').reduce((sum, r) => sum + r.averageAmount, 0);
if (pIncome === 0) pIncome = adjustedIncome; // Fallback to current month if no recurrences detected

let pExpense = recurrences.filter(r => r.type === 'expense').reduce((sum, r) => sum + r.averageAmount, 0);
if (pExpense === 0) pExpense = adjustedExpenses; // Fallback to current month if no recurrences detected

// Add debts if they are not already in recurrences (hard to know, but let's just use the debts array)
// But wait, if they pay debts, it might be in recurrences. Let's not double count.
// A better way is:
console.log({ pIncome, pExpense });
