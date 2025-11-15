import fs from "fs";
import fetch from "node-fetch";

const NETBOX_API_TOKEN = "2c2b8c3d0d89d92b57b43f286bd56d7c5a95db54";
const NETBOX_API_URL = "https://netbox-v3.wlink.com.np/api/virtualization/virtual-machines/";

// Load Xen Orchestra data (your JSON from previous step)
const xenData = JSON.parse(fs.readFileSync("xo_vms.json", "utf8"));
const xenHosts = Object.keys(xenData)

// Flatten Xen Orchestra VMs
const xenVMs = Object.values(xenData).flat();
const xenVMNames = xenVMs.map(vm => vm.name_label.toLowerCase());

// Fetch all VMs from NetBox (paginated)
async function fetchNetboxVMs() {
  let results = [];
  let url = NETBOX_API_URL;

  while (url) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${NETBOX_API_TOKEN}`,
      },
    });

    if (!response.ok) {
      throw new Error(`NetBox API Error: ${response.statusText}`);
    }

    const data = await response.json();
    results = results.concat(data.results);
    url = data.next; // Next page URL (if any)
  }

  return results;
}

(async () => {
  try {
    const netboxVMs = await fetchNetboxVMs();
    console.log(netboxVMs)
    const netboxVMNames = netboxVMs.filter(vm => xenHosts.includes(vm.cluster.name)).map(vm => vm.name.toLowerCase());

    // Compare
    const missingInNetBox = xenVMNames.filter(x => !netboxVMNames.includes(x));
    const missingInXen = netboxVMNames.filter(x => !xenVMNames.includes(x));

    console.log("✅ Total VMs in Xen Orchestra:", xenVMNames.length);
    console.log("✅ Total VMs in NetBox:", netboxVMNames.length);

    console.log("\n🚨 VMs missing in NetBox:");
    console.log(missingInNetBox.length ? missingInNetBox : "None");

    console.log("\n⚠️  VMs missing in Xen Orchestra:");
    console.log(missingInXen.length ? missingInXen : "None");
  } catch (err) {
    console.error("❌ Error:", err.message);
  }
})();
