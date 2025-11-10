import React, { useState, useEffect } from 'react';

function PolicyDashboard() {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const response = await fetch('/api/policies');
        if (!response.ok) {
          throw new Error('Failed to fetch policies');
        }
        const data = await response.json();
        setPolicies(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPolicies();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-800">Your Policies</h1>
      <div className="mt-8">
        <table className="min-w-full bg-white">
          <thead>
            <tr>
              <th className="py-2 px-4 border-b">Policy Number</th>
              <th className="py-2 px-4 border-b">Line of Business</th>
              <th className="py-2 px-4 border-b">Effective Date</th>
              <th className="py-2 px-4 border-b">Expiration Date</th>
            </tr>
          </thead>
          <tbody>
            {policies.map((policy) => (
              <tr key={policy.policyId}>
                <td className="py-2 px-4 border-b">{policy.policyNumber}</td>
                <td className="py-2 px-4 border-b">{policy.lineOfBusiness}</td>
                <td className="py-2 px-4 border-b">{new Date(policy.effectiveDate).toLocaleDateString()}</td>
                <td className="py-2 px-4 border-b">{new Date(policy.expirationDate).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PolicyDashboard;
