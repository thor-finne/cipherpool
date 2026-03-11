import { useOutletContext } from "react-router-dom";
import { Link } from "react-router-dom";

export default function Wallet() {
  const { profile } = useOutletContext();
  const isBlocked = profile?.verification_status !== "approved";

  const transactions = [
    { type: "Daily Claim", amount: "+1", date: "Today", status: "completed" },
    { type: "Tournament Win", amount: "+50", date: "Yesterday", status: "completed" },
    { type: "Joined Tournament", amount: "-10", date: "2 days ago", status: "completed" },
    { type: "Weekly Bonus", amount: "+5", date: "3 days ago", status: "completed" },
  ];

  return (
    <div className="space-y-8">
      
      <div>
        <h1 className="text-3xl font-bold text-[#F9FAFB]">Wallet</h1>
        <p className="text-[#9CA3AF] mt-1">Manage your coins and transactions</p>
      </div>

      <div className="bg-gradient-to-r from-[#6D28D9] to-[#5B21B6] rounded-xl p-8">
        <p className="text-sm text-purple-200 mb-2">Current Balance</p>
        <p className="text-5xl font-bold text-white mb-4">{profile?.coins || 0}</p>
        <p className="text-sm text-purple-200">≈ 0.00 USD</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <button
          disabled={isBlocked}
          className={`px-6 py-4 bg-[#111827] border border-[#1F2937] rounded-xl text-left hover:border-[#6D28D9] transition ${
            isBlocked ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <p className="text-xl mb-2">🎁</p>
          <p className="font-medium text-[#F9FAFB]">Claim Daily</p>
          <p className="text-sm text-[#9CA3AF]">+1 coin every 24h</p>
        </button>

        <Link
          to="/tournaments"
          className="px-6 py-4 bg-[#111827] border border-[#1F2937] rounded-xl text-left hover:border-[#6D28D9] transition"
        >
          <p className="text-xl mb-2">🏆</p>
          <p className="font-medium text-[#F9FAFB]">Join Tournament</p>
          <p className="text-sm text-[#9CA3AF]">Win up to 500 coins</p>
        </Link>
      </div>

      <div className="bg-[#111827] border border-[#1F2937] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-[#F9FAFB] mb-6">Transaction History</h2>
        <div className="space-y-4">
          {transactions.map((tx, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-[#1F2937]/30 rounded-lg">
              <div>
                <p className="font-medium text-[#F9FAFB]">{tx.type}</p>
                <p className="text-sm text-[#9CA3AF]">{tx.date}</p>
              </div>
              <span className={`font-bold ${
                tx.amount.startsWith('+') ? 'text-green-500' : 'text-red-500'
              }`}>
                {tx.amount} coins
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}