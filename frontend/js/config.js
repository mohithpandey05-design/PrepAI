(function () {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    const isLocal = protocol === 'file:' ||
                    hostname === 'localhost' ||
                    hostname === '127.0.0.1' ||
                    hostname === '' ||
                    hostname.startsWith('192.168.') ||
                    hostname.startsWith('10.') ||
                    hostname.endsWith('.local');

    window.API_BASE_URL = isLocal ? 'http://localhost:5001' : window.location.origin;
})();
