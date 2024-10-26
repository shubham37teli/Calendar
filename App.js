import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Button,
  Alert,
} from "react-native";
import * as Calendar from "expo-calendar";

export default function App() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isReminderSet, setIsReminderSet] = useState(false);

  useEffect(() => {
    (async () => {
      const granted = await getCalendarPermissions();
      if (granted) {
        const fetchedEvents = await getUpcomingEvents();
        setEvents(fetchedEvents);
      }
    })();
  }, []);

  async function getCalendarPermissions() {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === "granted";
  }

  async function getUpcomingEvents() {
    try {
      const calendars = await Calendar.getCalendarsAsync();
      const calendarIds = calendars.map((calendar) => calendar.id);

      const now = new Date();
      const oneMonthFromNow = new Date(now.setMonth(now.getMonth() + 3));

      const events = await Calendar.getEventsAsync(
        calendarIds,
        new Date(),
        oneMonthFromNow
      );
      events.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

      return events;
    } catch (error) {
      console.error("Error fetching events: ", error);
      Alert.alert("Error", "There was an error fetching calendar events.");
      return [];
    }
  }

  const handleEventClick = useCallback(async (event) => {
    // Fetch the latest event details to ensure the reminder status is updated
    try {
      const updatedEvent = await Calendar.getEventAsync(event.id);
      setSelectedEvent(updatedEvent);

      // Check if alarms (reminders) are set for the event
      const reminderSet = updatedEvent.alarms && updatedEvent.alarms.length > 0;
      setIsReminderSet(reminderSet);

      setModalVisible(true);
    } catch (error) {
      console.error("Error fetching event details: ", error);
      Alert.alert("Error", "Could not load event details.");
    }
  }, []);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedEvent(null);
    setIsReminderSet(false); // Reset the reminder state when closing
  }, []);

  const updateReminder = async () => {
    if (selectedEvent) {
      try {
        const newReminder = {
          method: Calendar.AlarmMethod.ALERT,
          relativeOffset: 0, // No offset, set reminder at the event time
        };

        await Calendar.updateEventAsync(selectedEvent.id, {
          alarms: [newReminder],
        });

        setIsReminderSet(true);
        Alert.alert("Success", "Reminder set for the event.");
      } catch (error) {
        console.error("Error setting reminder: ", error);
        Alert.alert("Error", "There was an error setting the reminder.");
      }
    }
  };

  const resetReminder = async () => {
    if (selectedEvent) {
      try {
        await Calendar.updateEventAsync(selectedEvent.id, {
          alarms: [], // Reset alarms by setting to an empty array
        });

        setIsReminderSet(false);
        Alert.alert("Success", "The reminder has been removed.");
      } catch (error) {
        console.error("Error resetting reminder: ", error);
        Alert.alert("Error", "There was an error resetting the reminder.");
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Upcoming Events</Text>

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => handleEventClick(item)}>
            <View style={styles.eventItem}>
              <Text style={styles.eventTitle}>{item.title}</Text>
              <Text>
                {new Date(item.startDate).toLocaleDateString()}{" "}
                {new Date(item.startDate).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true, // Use true for 12-hour format with AM/PM
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No upcoming events found.</Text>
        }
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalView}>
          {selectedEvent && (
            <>
              <Text style={styles.modalTitle}>{selectedEvent.title}</Text>
              <Text style={styles.modalText}>
                Date:{" "}
                {new Date(selectedEvent.startDate).toLocaleDateString("en-US", {
                  weekday: "long", // "Monday"
                  day: "numeric", // "21"
                  month: "long", // "October"
                })}
              </Text>
              {selectedEvent.location && (
                <Text style={styles.modalText}>
                  Location: {selectedEvent.location}
                </Text>
              )}
              {selectedEvent.notes && (
                <Text style={styles.modalText}>
                  Description: {selectedEvent.notes}
                </Text>
              )}

              {isReminderSet ? (
                <>
                  <Text style={styles.modalText}>
                    Reminder set for the event time.
                  </Text>
                  <Button title="Reset Reminder" onPress={resetReminder} />
                </>
              ) : (
                <>
                  <Button title="Set Reminder" onPress={updateReminder} />
                </>
              )}
              <View style={styles.closebtn}>
                <Button title="Close" onPress={closeModal} />
              </View>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "rgb(28 143 170)",
  },
  header: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 10,
    paddingTop: 20,
  },
  eventItem: {
    padding: 10,
    marginVertical: 5,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#fff",
  },
  modalText: {
    fontSize: 18,
    color: "#fff",
    marginBottom: 5,
  },
  emptyText: {
    fontSize: 18,
    color: "gray",
    textAlign: "center",
    marginTop: 20,
  },
  closebtn: {
    padding: 10,
  },
});
