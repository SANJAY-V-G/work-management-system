import React from 'react';

const DownloadCSV = ({ logs, username }) => {
    const convertToCSV = (objArray) => {
        const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
        let str = 'Date,Login Time,Logout Time,Duration (minutes),Pop Description,Push Command,Username\r\n';

        for (let i = 0; i < array.length; i++) {
            let line = '';
            const log = array[i];
            
            const loginDate = new Date(log.login_time).toLocaleDateString();
            const loginTime = new Date(log.login_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const logoutTime = log.logout_time ? new Date(log.logout_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Active';
            const duration = log.duration_minutes !== null ? log.duration_minutes : 'N/A';
            const popDesc = log.pop_description ? `"${log.pop_description.replace(/"/g, '""')}"` : '';
            const pushCmd = log.push_command ? `"${log.push_command.replace(/"/g, '""')}"` : '';
            
            const user = log.user ? log.user.username : username;
            
            line += `${loginDate},${loginTime},${logoutTime},${duration},${popDesc},${pushCmd},${user},`;

            str += line + '\r\n';
        }
        return str;
    };

    const downloadCSV = () => {
        const csvData = new Blob([convertToCSV(logs)], { type: 'text/csv' });
        const csvURL = URL.createObjectURL(csvData);
        const link = document.createElement('a');
        link.href = csvURL;
        const filename = username === 'Admin' ? 'all_users_work_report.csv' : `work_report_${username}.csv`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <button
            onClick={downloadCSV}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
        >
            Download CSV
        </button>
    );
};

export default DownloadCSV;
