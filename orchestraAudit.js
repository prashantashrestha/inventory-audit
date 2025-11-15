import fetch from 'node-fetch';
import fs from 'fs';

const XO_HOST = 'http://orchestra.wlink.com.np';
const AUTH_TOKEN = '4b-DxYjypA3I6YeRm-l_C37c_Mrq9wicnl_gCowfcnM';

// Pre-fetch all VM details to minimize API calls later
let vmDetails = {};
(async () => {
  try {
    vmDetails = await fetchVms();

    await fetchHostsAndResidentVms();
  } catch (err) {
    console.error('Error during initialization:', err);
  }
})();

// Common fetch function with authentication
async function fetchWithAuth(url) {
  try {
    const res = await fetch(url, {
      headers: { 'Cookie': `authenticationToken=${AUTH_TOKEN}` }
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
  } catch (err) {
    console.error(`Error fetching URL ${url}:`, err);
    throw err;
  }
}

// Fetch all hosts and their resident VMs
async function fetchHostsAndResidentVms() {
    try {
        const url = `${XO_HOST}/rest/v0/hosts?fields=name_label`;
        const hosts = await fetchWithAuth(url);
        const hostsInfo = {};
        for (const host of hosts) {
            const residentVms = await fetchResidentVms(host.href);
            hostsInfo[host.name_label] = residentVms.map(vm => ({
                name_label: vm.name_label,
                power_state: vm.power_state,
 //               mainIpAddress: vm.mainIpAddress
            }));
        }

        fs.writeFileSync("xo_vms.json",JSON.stringify(hostsInfo, null, 2));
    } catch (err) {
        console.error('Error fetching Hosts and Resident VMs:', err);
    }
}

// Fetch resident VMs for a specific host
async function fetchResidentVms(hostUrl) {
  try {
    const url = `${XO_HOST}${hostUrl}`;
    const hostData = await fetchWithAuth(url);
    if (Array.isArray(hostData.residentVms)) {
	console.log(hostData.residentVms.length)
      return hostData.residentVms
        .map(vmId => vmDetails[vmId])
        .filter(Boolean); // Filter out undefined VMs
    }
    console.log('No resident VMs found.');
    return [];
  } catch (err) {
    console.error('Error fetching resident VMs:', err);
    return [];
  }
}

// Fetch all VMs and transform into a lookup object
async function fetchVms() {
  try {
    const url = `${XO_HOST}/rest/v0/vms?fields=uuid,name_label,mainIpAddress,power_state`;
    const vms = await fetchWithAuth(url);
    const vmLookup = {};
    for (const vm of vms) {
      vmLookup[vm.uuid] = {
        name_label: vm.name_label,
        power_state: vm.power_state,
        //mainIpAddress: vm.mainIpAddress
      };
    }
    return vmLookup;
  } catch (err) {
    console.error('Error fetching VMs:', err);
    return {};
  }
}

