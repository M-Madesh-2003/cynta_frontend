let lastLocation = null;
let map;
let userMarker;
let trackingVendor = null;
let currentRoute = null;
const socket = io("https://cynta-backend.onrender.com/");
let vendorMarkers = [];

// Socket Connection
socket.on("connect", () => {
  console.log("Socket connected");
});

socket.on("vendorDetails", (data) => {
  console.log(data)
  clearVendorMarkers();
  resetTracking();

  if (Array.isArray(data)) {
    data.forEach((vendor) => addVendorMarker(vendor));
    if (data.length > 0) {
      autoDrawRouteToVendor(data[0]);
    }
  } else if (data.location) {
    addVendorMarker(data);
    autoDrawRouteToVendor(data);
  } else {
    alert("Invalid vendor data");
    console.log(data);
  }
});

function initializeMap() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        map = new google.maps.Map(document.getElementById("map"), {
          center: { lat, lng },
          zoom: 15,
          streetViewControl: false,
          styles: [
            {
              featureType: "poi.business",
              elementType: "labels",
              stylers: [
                {
                  visibility: "off",
                },
              ],
            },
            {
              featureType: "poi.park",
              elementType: "labels",
              stylers: [
                {
                  visibility: "off",
                },
              ],
            },
            {
              featureType: "poi.place_of_worship",
              elementType: "labels",
              stylers: [
                {
                  visibility: "off",
                },
              ],
            },
            {
              featureType: "poi.school",
              elementType: "labels",
              stylers: [
                {
                  visibility: "off",
                },
              ],
            },
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [
                {
                  visibility: "off",
                },
              ],
            },
            {
              featureType: "road",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
            {
              featureType: "administrative",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
            {
              featureType: "landscape",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
            {
              featureType: "administrative.country",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
            {
              featureType: "administrative.province",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
            {
              featureType: "administrative.locality",
              elementType: "labels",
              stylers: [
                {
                  visibility: "on",
                },
              ],
            },
          ],
        });

        userMarker = new google.maps.Marker({
          position: { lat, lng },
          map,
          title: "Your Location",
          icon: {
            url:
              "data:image/svg+xml;charset=UTF-8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="24.422" height="29.309" viewBox="0 0 24.422 29.309">
  <g id="Group_22757" data-name="Group 22757" transform="translate(-2092 -169)">
    <circle id="Ellipse_240" data-name="Ellipse 240" cx="8.5" cy="8.5" r="8.5" transform="translate(2096.298 175)" fill="#ee374d"/>
    <path id="map-marker-check" d="M22.857,3.586A12.218,12.218,0,1,0,5.587,20.875l8.63,8.44,8.64-8.45a12.234,12.234,0,0,0,0-17.279ZM14.1,16.4a2.421,2.421,0,0,1-1.719.709,2.445,2.445,0,0,1-1.73-.715L7.254,13.1l1.7-1.756,3.413,3.308,7.1-6.966,1.715,1.741L14.1,16.4Z" transform="translate(2089.993 168.994)" fill="#ee374d"/>
    <g id="user_1_" data-name="user (1)" transform="translate(2036.268 175)">
      <circle id="Ellipse_245" data-name="Ellipse 245" cx="2.656" cy="2.656" r="2.656" transform="translate(65.503)" fill="#f0f5ff"/>
      <path id="Path_16679" data-name="Path 16679" d="M68.19,298.667a4.194,4.194,0,0,1,4.19,4.19.466.466,0,0,1-.466.466H64.466a.466.466,0,0,1-.466-.466A4.194,4.194,0,0,1,68.19,298.667Z" transform="translate(-0.268 -292.15)" fill="#f0f5ff"/>
    </g>
  </g>
</svg>`
              ),
            scaledSize: new google.maps.Size(50, 50),
          },
        });

        lastLocation = { latitude: lat, longitude: lng };
        updateMapLocation(lat, lng);
        startTracking();
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("Unable to retrieve location.");
      },
      { enableHighAccuracy: true }
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

function updateMapLocation(lat, lng) {
  if (userMarker) {
    userMarker.setPosition(new google.maps.LatLng(lat, lng));
    map.panTo(new google.maps.LatLng(lat, lng));
  }
}

function drawRoute(startLocation, endLocation, isLiveTracking = false) {
  if (!startLocation || !endLocation) {
    console.error("Invalid start or end location for route.");
    return;
  }

  if (currentRoute && isLiveTracking) {
    currentRoute.setMap(null);
  }

  const start = new google.maps.LatLng(
    startLocation.latitude,
    startLocation.longitude
  );
  const end = new google.maps.LatLng(
    endLocation.latitude,
    endLocation.longitude
  );

  const directionsService = new google.maps.DirectionsService();
  currentRoute = new google.maps.DirectionsRenderer({
    map: map,
    polylineOptions: {
      strokeColor: "#ff0000",
      strokeWeight: 4,
    },
    suppressMarkers: true,
  });

  directionsService.route(
    {
      origin: start,
      destination: end,
      travelMode: google.maps.TravelMode.DRIVING,
    },
    (result, status) => {
      if (status === google.maps.DirectionsStatus.OK) {
        currentRoute.setDirections(result);
      } else {
        console.error("Directions request failed:", status);
      }
    }
  );
}

function startTracking() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (
          !lastLocation ||
          getDistance(lastLocation, { latitude: lat, longitude: lng }) > 5
        ) {
          lastLocation = { latitude: lat, longitude: lng };
          updateMapLocation(lat, lng);

          socket.emit("customerData", {
            name: document.getElementById("username").value,
            email: document.getElementById("useremail").value,
            vendorType: document.getElementById("choose-vendor").value,
            location: lastLocation,
          });

          if (trackingVendor) {
            drawRoute(lastLocation, trackingVendor.location, true);
          }
        }
      },
      (error) => {
        console.error("Error tracking location:", error);
      },
      { enableHighAccuracy: true }
    );
  }
}

function getDistance(loc1, loc2) {
  const R = 6371e3;
  const lat1 = (loc1.latitude * Math.PI) / 180;
  const lat2 = (loc2.latitude * Math.PI) / 180;
  const deltaLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const deltaLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLon / 2) *
      Math.sin(deltaLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function addVendorMarker(vendor) {
  if (!vendor || !vendor.location) return;

  const position = new google.maps.LatLng(
    vendor.location.latitude,
    vendor.location.longitude
  );

  const vendorMarker = new google.maps.Marker({
    position,
    map,
    title: vendor.name,
    icon: {
      url:
        "data:image/svg+xml;charset=UTF-8," +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="24.422" height="29.309" viewBox="0 0 24.422 29.309">
  <g id="Group_22745" data-name="Group 22745" transform="translate(-2047 -169)">
    <path id="map-marker-check" d="M22.857,3.586A12.218,12.218,0,1,0,5.587,20.875l8.63,8.44,8.64-8.45a12.234,12.234,0,0,0,0-17.279ZM14.1,16.4a2.421,2.421,0,0,1-1.719.709,2.445,2.445,0,0,1-1.73-.715L7.254,13.1l1.7-1.756,3.413,3.308,7.1-6.966,1.715,1.741L14.1,16.4Z" transform="translate(2044.993 168.994)" fill="#2078ff"/>
    <circle id="Ellipse_239" data-name="Ellipse 239" cx="8.5" cy="8.5" r="8.5" transform="translate(2051 175)" fill="#2078ff"/>
    <path id="seller" d="M9.166,7.3v.155a.9.9,0,0,1-.865.931H8.012a.9.9,0,0,1-.865-.931v0h0a.9.9,0,0,1-.865.931H5.994a.888.888,0,0,1-.855-.789.532.532,0,0,1,.044-.274l.165-.4A1.4,1.4,0,0,1,6.64,6.054H9.672a1.4,1.4,0,0,1,1.291.864l.165.4a.527.527,0,0,1,.044.274.888.888,0,0,1-.855.789h-.288a.9.9,0,0,1-.865-.931h0M6.519,2.794A2.794,2.794,0,1,0,3.726,5.589,2.8,2.8,0,0,0,6.519,2.794Zm3.8,6.52h-.288a1.733,1.733,0,0,1-.864-.231,1.739,1.739,0,0,1-.865.231H8.012a1.737,1.737,0,0,1-.865-.231,1.736,1.736,0,0,1-.864.231H5.994a1.72,1.72,0,0,1-.4-.053V9.78a1.4,1.4,0,0,0,1.4,1.4H9.321a1.4,1.4,0,0,0,1.4-1.4V9.262a1.7,1.7,0,0,1-.4.053ZM4.663,9.78V8.691a1.871,1.871,0,0,1-.447-.965,1.446,1.446,0,0,1,.1-.759L4.474,6.6A3.728,3.728,0,0,0,0,10.246v.466a.466.466,0,0,0,.466.466H5.141a2.3,2.3,0,0,1-.478-1.4Z" transform="translate(2054 175)" fill="#f0f5ff"/>
  </g>
</svg>
`
        ),
      scaledSize: new google.maps.Size(50, 50),
    },
  });

  vendorMarkers.push(vendorMarker);

  const infoWindowContent = (
   `<div>
      <h3>
        ${vendor.companyName} (${vendor.companyType})
      </h3>
      <p>
        <b>Name:</b> ${vendor.name}
      </p>
      <p>
        <b>Contact:</b> ${vendor.contact}
      </p>
      <p>
        <b>Email:</b> ${vendor.email}
      </p>
      <p>
        <b>Address:</b> ${vendor.address}
      </p>
    </div>`
  );
  const infoWindow = new google.maps.InfoWindow({
    content: infoWindowContent,
  });

  vendorMarker.addListener("mouseover", () => {
    infoWindow.open(map, vendorMarker);
    trackingVendor = vendor;
  });

  vendorMarker.addListener("mouseout", () => {
    infoWindow.close();
  });

 /*  vendorMarker.addListener("click", () => {
    drawRoute(lastLocation, vendor.location, true);
    trackingVendor = vendor;
  }); */
}

function clearVendorMarkers() {
  vendorMarkers.forEach((marker) => marker.setMap(null));
  vendorMarkers = [];
}

function autoDrawRouteToVendor(vendor) {
  if (vendor && vendor.location && lastLocation) {
    trackingVendor = vendor;
    drawRoute(lastLocation, vendor.location, true);
  }
}

function resetTracking() {
  trackingVendor = null;
  if (currentRoute) {
    currentRoute.setMap(null);
  }
}

/* socket.on("vendorDetails", (vendor) => {
  console.log(vendor);
  const vendorContainer = document.getElementById("vendor-notification");

  if (vendor && vendor.length > 0) {
    vendorContainer.innerHTML = "";

    vendor.forEach((data) => {
      vendorContainer.innerHTML += `
        <div id="vendorDetailsPopup" style="background-color: #3237CE;
          border-radius: 15px;
          color: white;
          width: 250px;
          max-height: 350px;
          padding: 20px;
          position: fixed;
          flex-direction: column;
          right: 10px;
          bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 6px;">
          <p style="
          position: absolute; 
          right: 10px; 
          top: 10px; 
          width: 25px; 
          height: 25px; 
          background: rgba(255, 255, 255, 0.2); 
          backdrop-filter: blur(10px); 
          border-radius: 50%; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 16px;
          cursor: pointer;
          border: 1px solid rgba(255, 255, 255, 0.2);" 
          onClick="closeVendorNotification(this)">
          x
          </p>
          <p style="font-size: 20px; font-weight: bold; text-align: center; margin: 0px">
            ${data.companyName}
          </p>
          <div style="display: flex; flex-direction: column;">
            <p style="font-size: 18px; text-align: center; margin: 0px">
              ${data.name}
            </p>
            <a href="tel:${data.contact}" style="color: white; text-align: center; text-decoration: none; padding-top: 5px; margin: 0px">
              ${data.contact}
            </a>
          </div>
          <div style="text-align: center; font-size: 12px; margin: 0px">
            ${data.address}
          </div>
          <a href="mailto:${data.email}" style="text-align: center;
             color: black;
             background-color: white;
             border-radius: 40px;
             width: 65%;
             padding: 8px 0px;
             font-size: 14px;
             text-decoration: none;">
            Quick contact
          </a>
        </div>
      `;
    });
  } else {
    vendorContainer.innerHTML =
      '<p style="text-align: center">No Vendors Available</p>';
  }
});
 */

function openVendorFeature() {
  const popup = document.getElementById("vendor-popup");
  popup.style.display = "flex";
}

function openForm() {
  closePopup();

  const usertypeContainer = document.getElementById(
    "usertype-selection-container"
  );
  if (usertypeContainer) {
    usertypeContainer.style.display = "flex";
  } else {
    console.error(
      "Element with id 'usertype-selection-container' not found in the DOM."
    );
  }
}

function closePopup() {
  let popupbox = document.getElementById("vendor-popup");
  popupbox.style.display = "none";
}

function closeVendorNotification() {
  let vendorPopup = document.getElementById("vendorDetailsPopup");
  vendorPopup.style.display = "none";
}

function closeUserType() {
  let userType = document.getElementById("usertype-selection-container");
  userType.style.display = "none";
}

function submitUserType() {
  const selectedCategory = document.querySelector(
    'input[name="usertype"]:checked'
  );

  if (selectedCategory.value === "customer") {
    let customerForm = document.getElementById("customer-form-container");
    customerForm.style.display = "block";
    closeUserType();
  } else if (selectedCategory.value === "vendor") {
    let vendorForm = document.getElementById("vendor-form-container");
    vendorForm.style.display = "block";
    closeUserType();
  }
}

function closeForm(usercategory) {
  if (usercategory === "customer") {
    let customerFormClose = document.getElementById("customer-form-container");
    customerFormClose.style.display = "none";
  } else if (usercategory === "vendor") {
    let vendorFormClose = document.getElementById("vendor-form-container");
    vendorFormClose.style.display = "none";
  }
}

function getUserLocation() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (data) => {
        const userLocation = {
          latitude: data.coords.latitude,
          longitude: data.coords.longitude,
        };
        console.log(userLocation);
        resolve(userLocation);
      },
      (error) => {
        console.error("Error getting location:", error);
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0,
      }
    );
  });
}

function submitUserDetails(e) {
  e.preventDefault();

  const name = document.getElementById("username").value;
  const email = document.getElementById("useremail").value;
  const vendorType = document.getElementById("choose-vendor").value;

  getUserLocation()
    .then((location) => {
      const userDetails = {
        name,
        email,
        vendorType,
        location: location,
      };
      socket.emit("customerData", userDetails);
      const customerForm = document.getElementById("customer-form-container");
      customerForm.style.display = "none";

      document.getElementById("map-view").style.display = "block";
      initializeMap();
    })
    .catch((error) => console.log("Failed to retrieve location", error));
}

function resetForm(data) {
  if (data === "customer") {
    document.getElementById("username").value = "";
    document.getElementById("useremail").value = "";
    document.getElementById("choose-vendor").value = "none";
  } else if (data === "vendor") {
    document.getElementById("vendorname").value = "";
    document.getElementById("vendoremail").value = "";
    document.getElementById("choose-vendor").value = "none";
    document.getElementById("companyname").value = "";
    document.getElementById("vendorcontact").value = "";
    document.getElementById("companyaddress").value = "";
  }
}

function submitVendorDetails(e) {
  console.log("submitteds");
  e.preventDefault();

  const name = document.getElementById("vendorname").value;
  const email = document.getElementById("vendoremail").value;
  const companyType = document.getElementById("choose-company-type").value;
  const companyName = document.getElementById("companyname").value;
  const contact = document.getElementById("vendorcontact").value;
  const address = document.getElementById("companyaddress").value;

  console.log(
    "vendor",
    name,
    email,
    companyType,
    companyName,
    contact,
    address
  );

  getUserLocation()
    .then((location) => {
      const vendorDetails = {
        name,
        email,
        companyType,
        companyName,
        contact,
        address,
        location: location,
      };
      console.log("vend", vendorDetails);
      socket.emit("vendorDetails", vendorDetails);
      const vendorForm = document.getElementById("vendor-form-container");
      vendorForm.style.display = "none";
    })
    .catch((error) => console.log("Failed to retrieve location", error));
}
