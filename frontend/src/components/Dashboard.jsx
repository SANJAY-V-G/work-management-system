import React, { useState, useEffect } from 'react';
import { getMe, startWork, stopWork, getWorkLogs, getWorkStatus } from '../services/api';
import DownloadCSV from './DownloadCSV';

const Dashboard = ({ token, handleLogout }) => {
    const [user, setUser] = useState(null);
    const [status, setStatus] = useState('inactive'); // 'active' or 'inactive'
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startTime, setStartTime] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [popDescription, setPopDescription] = useState('');
    const [pushCommand, setPushCommand] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const userRes = await getMe();
                setUser(userRes.data);

                const statusRes = await getWorkStatus();
                if (statusRes.data.status === 'active') {
                    setStatus('active');
                    setStartTime(new Date(statusRes.data.start_time));
                }

                await fetchLogs();
            } catch (error) {
                console.error("Error fetching data", error);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchData();
        }
    }, [token]);

    const fetchLogs = async () => {
        try {
            const logsRes = await getWorkLogs();
            setLogs(logsRes.data);
        } catch (error) {
            console.error("Error fetching logs", error);
        }
    };

    const handleStartWork = async () => {
        try {
            await startWork();
            setStatus('active');
            setStartTime(new Date());
            await fetchLogs(); // Refresh logs to show new incomplete session if needed, or mostly just update status
        } catch (error) {
            alert(error.response?.data?.detail || "Error starting work");
        }
    };

    const openStopModal = () => {
        setPopDescription('');
        setPushCommand('');
        setShowModal(true);
    };

    const handleConfirmStop = async () => {
        const wordCount = popDescription.trim().split(/\s+/).length;
        if (wordCount > 100) {
            alert(`Description is too long (${wordCount} words). Limit is 100 words.`);
            return;
        }
        
        try {
            await stopWork({ pop_description: popDescription, push_command: pushCommand });
            setStatus('inactive');
            setStartTime(null);
            setShowModal(false);
            await fetchLogs();
        } catch (error) {
            alert(error.response?.data?.detail || "Error stopping work");
        }
    };

    const calculateTotalHours = () => {
        const totalMinutes = logs.reduce((acc, log) => acc + (log.duration_minutes || 0), 0);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50 font-sans">
            {/* Navbar / Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Work Tracker</h1>
                        <p className="text-blue-100 text-sm">Welcome back, {user?.username}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={handleLogout}
                            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded shadow transition duration-200 ease-in-out transform hover:scale-105"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Status Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    {/* Current Session Card */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-2xl border border-gray-100">
                        <div className="p-1 bg-gradient-to-r from-green-400 to-blue-500"></div>
                        <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
                            <h2 className="text-gray-500 font-medium uppercase tracking-wide text-sm mb-2">Current Status</h2>
                            <div className={`text-3xl font-bold mb-6 ${status === 'active' ? 'text-green-600' : 'text-gray-400'}`}>
                                {status === 'active' ? (
                                    <div className="flex flex-col items-center animate-pulse">
                                        <span>Active Session</span>
                                        <span className="text-base font-normal text-gray-500 mt-1">Started at {startTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                ) : (
                                    <span>Inactive</span>
                                )}
                            </div>
                            {status === 'inactive' ? (
                                <button
                                    onClick={handleStartWork}
                                    className="w-full md:w-auto bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    Start Work
                                </button>
                            ) : (
                                <button
                                    onClick={openStopModal}
                                    className="w-full md:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-10 rounded-full text-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                                >
                                    Stop Work
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Actions Card */}
                    <div className="bg-white rounded-xl shadow-lg overflow-hidden transform transition duration-300 hover:shadow-2xl border border-gray-100">
                        <div className="p-1 bg-gradient-to-r from-purple-400 to-pink-500"></div>
                         <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
                            <h2 className="text-gray-500 font-medium uppercase tracking-wide text-sm mb-6">Quick Actions</h2>
                            <div className="w-full flex justify-center">
                                <DownloadCSV logs={logs} username={user?.username} />
                            </div>
                            <p className="mt-4 text-gray-400 text-sm text-center">Export your complete work history to CSV format for reporting.</p>
                        </div>
                    </div>
                </div>

                {/* Logs Table */}
                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-700">Work Logs History</h2>
                        <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">{logs.length} Entries</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Login Time</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Logout Time</th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {logs.map((log, index) => (
                                    <tr key={log.id} className={`hover:bg-blue-50 transition duration-150 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            {new Date(log.login_time).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(log.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {log.logout_time ? (
                                                new Date(log.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    Active
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 font-medium">
                                            {log.duration_minutes !== null ? (
                                                <span>{Math.floor(log.duration_minutes / 60)}h <span className="text-gray-400">|</span> {log.duration_minutes % 60}m</span>
                                            ) : (
                                                <span className="text-gray-400 animate-pulse">Tracking...</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-10 text-center text-gray-500">
                                            <div className="flex flex-col items-center">
                                                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                                </svg>
                                                <p className="text-base">No work logs found yet.</p>
                                                <p className="text-sm text-gray-400 mt-1">Start a session to begin tracking.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white rounded-lg p-8 w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">End Session Details</h2>
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Pop Description (Max 100 words)
                            </label>
                            <textarea
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
                                value={popDescription}
                                onChange={(e) => setPopDescription(e.target.value)}
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-bold mb-2">
                                Push Command
                            </label>
                            <input
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                type="text"
                                value={pushCommand}
                                onChange={(e) => setPushCommand(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <button
                                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                type="button"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                                type="button"
                                onClick={handleConfirmStop}
                            >
                                Confirm & Stop
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;
