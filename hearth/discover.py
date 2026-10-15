"""Find Samsung Tizen TVs on the local network with SSDP (many TVs ignore ping)."""
import json
import re
import socket
import urllib.request

MSEARCH = ("M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\n"
           "MX: 2\r\nST: upnp:rootdevice\r\n\r\n").encode()


def discover(timeout=3):
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM, socket.IPPROTO_UDP)
    sock.setsockopt(socket.IPPROTO_IP, socket.IP_MULTICAST_TTL, 2)
    sock.settimeout(timeout)
    sock.sendto(MSEARCH, ("239.255.255.250", 1900))
    hosts = set()
    try:
        while True:
            data, (ip, _port) = sock.recvfrom(4096)
            if re.search(rb"samsung", data, re.I):
                hosts.add(ip)
    except socket.timeout:
        pass
    finally:
        sock.close()
    tvs = []
    for ip in sorted(hosts):
        try:
            d = json.load(urllib.request.urlopen(f"http://{ip}:8001/api/v2/", timeout=3))["device"]
        except Exception:
            continue
        tvs.append({"ip": ip, "name": d["name"].replace("&quot;", '"'), "model": d.get("modelName"),
                    "os": d.get("OS"), "developerMode": d.get("developerMode"),
                    "developerIP": d.get("developerIP")})
    return tvs
