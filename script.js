var CALENDARS = [
  {
    id: "ronward.english@gmail.com",
    label: "BS",
    color: "blue"
  },
    {
    id: "tm-kids.com_i066m9p1pvu8ouuknb4hal74u4@group.calendar.google.com",
    label: "本町",
    color: "orange"
  },
      {
    id: "c_a10cfefde2a5de52589bc01f1c2899c8d7035acfe6349bb7b7e47177a56b592e@group.calendar.google.com",
    label: "ひびき",
    color: "orange"
  },
  {
    id: "c_1au77uvsbhjjkbbn0u0o1nvfdo@group.calendar.google.com",
    label: "杉並",
    color: "orange"
  }
];

// Replace with your Google API key
var API_KEY = "AIzaSyAJkLCd0IJ2dPxLeijCUO7HClOwSoy5j-Q";

/**
 * Create a simple monthly calendar and fetch events from Google Calendar.
 * This is set up for older iOS devices, so we're using ES5 syntax and XHR.
 */
(function() {
  // -------------------------
  // Global variables & setup
  // -------------------------
  var dayEventsMap = {};
  var today = new Date();
  var currentYear = today.getFullYear();
  var currentMonth = today.getMonth(); // 0-based (0 = January)

  // Calendar element references
  var headerEl = document.getElementById("calendar-header");
  var calendarDaysEl = document.getElementById("calendar-days");
  var calendarContainer = document.getElementById("calendar-container");

  // Month names for the header
  var monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // -------------------------
  // Build Calendar & Fetch
  // -------------------------
  buildCalendar(currentYear, currentMonth);
  fetchEventsForAllCalendars();

  /**
   * Creates/updates the calendar layout for a given year and month
   */
  function buildCalendar(year, month) {
    // Clear dayEventsMap whenever we rebuild
    dayEventsMap = {};

    // Display header text
    headerEl.textContent = monthNames[month] + " " + year;

    // Clear the existing day cells
    calendarDaysEl.innerHTML = "";

    // Determine start day of the month, and number of days
    var firstDayOfMonth = new Date(year, month, 1);
    var startDay = firstDayOfMonth.getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    // Insert blank cells before day 1
    var i;
    for (i = 0; i < startDay; i++) {
      var blankCell = document.createElement("div");
      blankCell.className = "day-cell";
      calendarDaysEl.appendChild(blankCell);
    }

    // Add actual day cells
    for (i = 1; i <= daysInMonth; i++) {
      var dayCell = document.createElement("div");
      dayCell.className = "day-cell";

      var dayNumber = document.createElement("span");
      dayNumber.className = "day-number";
      dayNumber.textContent = i;
      dayCell.appendChild(dayNumber);

      // Initialize storage
      dayEventsMap[i] = [];

      // Click -> open modal
      dayCell.addEventListener("click", (function(dayNum) {
        return function() {
          openModal(dayNum);
        };
      })(i));

      calendarDaysEl.appendChild(dayCell);
    }

    // Set up date range to fetch
    var startDate = new Date(year, month, 1);
    var endDate = new Date(year, month + 1, 0, 23, 59, 59);

    timeMin = toRFC3339(startDate);
    timeMax = toRFC3339(endDate);
  }

  /**
   * Move to the next month, then rebuild calendar + fetch events
   */
  function showNextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    buildCalendar(currentYear, currentMonth);
    fetchEventsForAllCalendars();
  }

  // -------------------------
  // Swipe / Touch handling
  // -------------------------
  var startX = null;
  var endX = null;
  var threshold = 50;  // Minimum swipe distance

  // Listen for touch events on the calendar container
  calendarContainer.addEventListener("touchstart", function(e) {
    if (e.touches.length === 1) {
      startX = e.touches[0].clientX;
    }
  });

  calendarContainer.addEventListener("touchmove", function(e) {
    if (startX !== null && e.touches.length === 1) {
      endX = e.touches[0].clientX;
    }
  });

  calendarContainer.addEventListener("touchend", function(e) {
    if (startX !== null && endX !== null) {
      var deltaX = startX - endX;
      if (deltaX > threshold) {
        // User scrolled right (swiped left) -> show next month
        showNextMonth();
      }
    }
    startX = null;
    endX = null;
  });

  // -------------------------
  // Google Calendar Fetch
  // -------------------------
  var timeMin, timeMax;

  function fetchEventsForAllCalendars() {
    function fetchEvents() {
      for (var i = 0; i < CALENDARS.length; i++) {
        fetchEventsForOneCalendar(CALENDARS[i]);
      }
    }
    // Initial fetch
    fetchEvents();
    // Refresh events every 5 minutes
    setInterval(function() {
      fetchEvents();
    }, 300000);
  }

  function fetchEventsForOneCalendar(calendar) {
    var url = "https://www.googleapis.com/calendar/v3/calendars/" +
      encodeURIComponent(calendar.id) +
      "/events?key=" + API_KEY +
      "&timeMin=" + timeMin +
      "&timeMax=" + timeMax +
      "&singleEvents=true&orderBy=startTime";

    var xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var data = JSON.parse(xhr.responseText);
        if (data && data.items) {
          renderEvents(data.items, calendar);
        }
      }
    };
    xhr.send();
  }

  function renderEvents(items, calendar) {
    for (var i = 0; i < items.length; i++) {
      var ev = items[i];

      var startStr = ev.start.dateTime
        ? ev.start.dateTime
        : (ev.start.date + "T00:00:00");
      var endStr = ev.end.dateTime
        ? ev.end.dateTime
        : (ev.end.date + "T23:59:59");

      var startDate = new Date(startStr);
      var endDate = new Date(endStr);
      var day = startDate.getDate();

      var eventInfo = {
        summary: ev.summary || "(No Title)",
        start: startDate,
        end: endDate,
        calendarLabel: calendar.label,
        calendarColor: calendar.color
      };

      if (!dayEventsMap[day]) {
        dayEventsMap[day] = [];
      }
      dayEventsMap[day].push(eventInfo);
    }
    // After storing events, refresh day cells
    refreshDayCells();
  }

  /**
   * Clear and re-render the day-cell events for the current month
   */
  function refreshDayCells() {
    var firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    var startDay = firstDayOfMonth.getDay();
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    var dayCells = calendarDaysEl.getElementsByClassName("day-cell");

    for (var d = 1; d <= daysInMonth; d++) {
      var cellIndex = startDay + d - 1;
      if (cellIndex >= 0 && cellIndex < dayCells.length) {
        var dayCell = dayCells[cellIndex];

        // Remove any existing event markers in this cell
        while (dayCell.getElementsByClassName("event")[0]) {
          dayCell.removeChild(dayCell.getElementsByClassName("event")[0]);
        }

        // Sort events by ascending start time
        var eventsForDay = dayEventsMap[d] || [];
        eventsForDay.sort(function(a, b) {
          return a.start - b.start;
        });

        // Re-append them in chronological order
        for (var j = 0; j < eventsForDay.length; j++) {
          var eventEl = document.createElement("div");
          eventEl.className = "event";
          eventEl.textContent = eventsForDay[j].calendarLabel;
          eventEl.style.borderLeft = "3px solid " + eventsForDay[j].calendarColor;
          eventEl.style.background = "#fff";
          dayCell.appendChild(eventEl);
        }
      }
    }
  }

  // -------------------------
  // Modal Handling
  // -------------------------
  var modalOverlay = document.getElementById("modal-overlay");
  var modalContent = document.getElementById("modal-content");
  var modalEventsList = document.getElementById("modal-events-list");
  var closeModalBtn = document.getElementById("close-modal");

  closeModalBtn.addEventListener("click", function() {
    closeModal();
  });

  modalOverlay.addEventListener("click", function(e) {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });

  function openModal(dayNum) {
    var dayNamesJa = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    var dateObj = new Date(currentYear, currentMonth, dayNum);
    var dayName = dayNamesJa[dateObj.getDay()];
    var dateNumber = dateObj.getDate();
    var year = dateObj.getFullYear();
    var monthNumber = dateObj.getMonth() + 1;

    var modalTitleEl = document.getElementById("modal-title");
    if (modalTitleEl) {
      modalTitleEl.textContent =
        year + "年" + monthNumber + "月" + dateNumber + "日 (" + dayName + ")";
    }

    modalEventsList.innerHTML = "";

    var events = dayEventsMap[dayNum] || [];
    events.sort(function(a, b) {
      return a.start - b.start;
    });

    for (var i = 0; i < events.length; i++) {
      var item = events[i];
      var startTime = formatTime(item.start);
      var endTime = formatTime(item.end);

      var itemDiv = document.createElement("div");
      itemDiv.className = "modal-event-item";
      itemDiv.innerHTML =
        "<div><strong>" + item.summary + "</strong></div>" +
        "<div>" + startTime + " - " + endTime + "</div>" +
        "<div style='color:" + item.calendarColor + "'>" + item.calendarLabel + "</div>";
      modalEventsList.appendChild(itemDiv);
    }
    modalOverlay.style.display = "flex";
  }

  function closeModal() {
    modalOverlay.style.display = "none";
  }

  function formatTime(dateObj) {
    var hours = dateObj.getHours();
    var minutes = dateObj.getMinutes();
    var hh = (hours < 10 ? "0" + hours : hours);
    var mm = (minutes < 10 ? "0" + minutes : minutes);
    return hh + ":" + mm;
  }

  /**
   * Converts a JS Date object into an RFC3339 string (YYYY-MM-DDTHH:MM:SSZ)
   */
  function toRFC3339(dateObj) {
    return dateObj.getFullYear() + "-" +
      pad(dateObj.getMonth() + 1) + "-" +
      pad(dateObj.getDate()) + "T" +
      pad(dateObj.getHours()) + ":" +
      pad(dateObj.getMinutes()) + ":" +
      pad(dateObj.getSeconds()) + "Z";
  }

  function pad(num) {
    return (num < 10 ? "0" : "") + num;
  }

})();

