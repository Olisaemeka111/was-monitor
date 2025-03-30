import { useState, useEffect } from 'react';

interface Account {
  account_id: string;
  account_name: string;
  created_at: string;
  last_checked: string;
}

export default function AccountList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch('/api/accounts');
      if (!response.ok) throw new Error('Failed to fetch accounts');
      const data = await response.json();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setLoading(false);
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const response = await fetch('/api/accounts', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });

      if (!response.ok) throw new Error('Failed to delete account');
      await fetchAccounts(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete account');
    }
  };

  if (loading) return <div>Loading accounts...</div>;
  if (error) return <div className="text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AWS Accounts</h2>
      {accounts.length === 0 ? (
        <p>No accounts configured</p>
      ) : (
        <div className="grid gap-4">
          {accounts.map((account) => (
            <div
              key={account.account_id}
              className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{account.account_name}</h3>
                  <p className="text-sm text-gray-500">
                    Last checked: {new Date(account.last_checked).toLocaleString()}
                  </p>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => window.location.href = `/monitor/${account.account_id}`}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Monitor
                  </button>
                  <button
                    onClick={() => deleteAccount(account.account_id)}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
