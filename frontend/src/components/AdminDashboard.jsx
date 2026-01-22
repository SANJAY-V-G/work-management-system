import React, { useState, useEffect } from 'react';
import { getAllUsers, getAllWorkLogs } from '../services/api';
import DownloadCSV from './DownloadCSV';

const AdminDashboard = ({ handleLogout }) => {
    const [users, setUsers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('logs'); // 'users' or 'logs'

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersRes = await getAllUsers();
                setUsers(usersRes.data);
                const logsRes = await getAllWorkLogs();
                setLogs(logsRes.data);
            } catch (error) {
                console.error("Error fetching admin data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
    );

    return (
         <div className="min-h-screen bg-gray-100 font-sans">
             <div className="bg-white shadow">
                <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
                    <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow transition duration-200">
                        Logout
                    </button>
                </div>
             </div>
             
             <div className="max-w-7xl mx-auto px-4 py-6">
                <div className="mb-6 flex space-x-4">
                    <button 
                        onClick={() => setView('logs')} 
                        className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 ${view === 'logs' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Work Logs
                    </button>
                    <button 
                        onClick={() => setView('users')} 
                        className={`px-6 py-2 rounded-full font-medium transition-colors duration-200 ${view === 'users' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    >
                        Users
                    </button>
                </div>

                {view === 'logs' && (
                    <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">All Work Logs</h2>
                            <DownloadCSV logs={logs} username="Admin" />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Login</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Logout</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Pop Desc</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Push Cmd</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {logs.map((log) => (
                                        <tr key={log.id} className="hover:bg-gray-50 transition duration-150">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{log.user?.username}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{new Date(log.login_time).toLocaleDateString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(log.login_time).toLocaleTimeString()}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {log.logout_time ? new Date(log.logout_time).toLocaleTimeString() : <span className="text-green-600 font-semibold">Active</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                                {log.duration_minutes != null ? `${Math.floor(log.duration_minutes / 60)}h ${log.duration_minutes % 60}m` : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate" title={log.pop_description}>
                                                {log.pop_description || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate font-mono" title={log.push_command}>
                                                {log.push_command || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-10 text-center text-gray-500">No logs found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {view === 'users' && (
                     <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
                        <div className="p-6 border-b border-gray-200 bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Registered Users</h2>
                        </div>
                        <ul className="divide-y divide-gray-200">
                            {users.map(user => (
                                <li key={user.id} className="px-6 py-4 flex justify-between hover:bg-gray-50 transition duration-150">
                                    <span className="font-medium text-gray-900">{user.username}</span>
                                    <span className="text-gray-500 text-sm bg-gray-100 px-2 py-1 rounded">ID: {user.id}</span>
                                </li>
                            ))}
                        </ul>
                     </div>
                )}
             </div>
         </div>
    );
};

export default AdminDashboard;
