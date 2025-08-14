import Foundation
import CoreLocation
import UserNotifications

@objc(LocationService)
class LocationService: NSObject, CLLocationManagerDelegate {
  
  private var locationManager: CLLocationManager?
  private var lastLocation: CLLocation?
  private var startTime: Date?
  private var distanceCovered: Double = 0.0
  private var walkedRoute: [CLLocation] = []
  private var isTracking: Bool = false
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func startService() {
    DispatchQueue.main.async {
      self.setupLocationManager()
      self.startTracking()
    }
  }
  
  @objc
  func stopService() {
    DispatchQueue.main.async {
      self.stopTracking()
    }
  }
  
  private func setupLocationManager() {
    if locationManager == nil {
      locationManager = CLLocationManager()
      locationManager?.delegate = self
      locationManager?.desiredAccuracy = kCLLocationAccuracyBest
      locationManager?.distanceFilter = 2 // meters
      locationManager?.allowsBackgroundLocationUpdates = true
      locationManager?.pausesLocationUpdatesAutomatically = false
      locationManager?.showsBackgroundLocationIndicator = true
      
      //
      // Request permissions
      locationManager?.requestAlwaysAuthorization()
    }
  }
  
  private func startTracking() {
    guard let locationManager = locationManager else { return }
    
    if !isTracking {
      isTracking = true
      startTime = Date()
      distanceCovered = 0.0
      walkedRoute.removeAll()
      
      // Start location updates
      locationManager.startUpdatingLocation()
      
      // Create notification
      setupNotification()
      
      // Post notification that tracking has started
      NotificationCenter.default.post(name: NSNotification.Name("tracking-started"), object: nil)
    }
  }
  
  private func stopTracking() {
    guard isTracking, let locationManager = locationManager else { return }
    
    isTracking = false
    locationManager.stopUpdatingLocation()
    
    // Remove notification
    UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    
    // Post notification that tracking has stopped
    let userInfo: [String: Any] = [
      "distance": distanceCovered / 1000,
      "duration": Date().timeIntervalSince(startTime ?? Date()) / 60
    ]
    NotificationCenter.default.post(name: NSNotification.Name("tracking-stopped"), object: nil, userInfo: userInfo)
  }
  
  private func setupNotification() {
    let content = UNMutableNotificationContent()
    content.title = "Tracking Active"
    content.body = "Tap to return to tracking"
    content.sound = .default
    
    // Create a trigger that repeats every minute
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 60, repeats: true)
    
    // Create the request
    let request = UNNotificationRequest(identifier: "trackingNotification", content: content, trigger: trigger)
    
    // Add the request to the notification center
    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        print("Error adding notification: \(error)")
      }
    }
  }
  
  private func updateNotification(distance: Double, duration: TimeInterval) {
    let content = UNMutableNotificationContent()
    content.title = "Tracking Active"
    content.body = "Distance: \(String(format: "%.2f", distance))km | Time: \(formatDuration(duration))"
    content.sound = nil
    
    // Create a trigger that fires immediately
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
    
    // Create the request
    let request = UNNotificationRequest(identifier: "trackingNotification", content: content, trigger: trigger)
    
    // Add the request to the notification center
    UNUserNotificationCenter.current().add(request) { error in
      if let error = error {
        print("Error updating notification: \(error)")
      }
    }
  }
  
  private func formatDuration(_ seconds: TimeInterval) -> String {
    let hours = Int(seconds) / 3600
    let minutes = (Int(seconds) % 3600) / 60
    let secs = Int(seconds) % 60
    return String(format: "%02d:%02d:%02d", hours, minutes, secs)
  }
  
  // MARK: - CLLocationManagerDelegate
  
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    guard isTracking, let location = locations.last, location.horizontalAccuracy <= 20 else { return }
    
    if let lastLocation = self.lastLocation {
      let distance = location.distance(from: lastLocation)
      if distance >= 2.0 { // Only update if moved at least 2 meters
        distanceCovered += distance
        walkedRoute.append(location)
        
        // Update notification
        if let startTime = startTime {
          let duration = Date().timeIntervalSince(startTime)
          updateNotification(distance: distanceCovered / 1000, duration: duration)
        }
        
        // Post notification with updated tracking data
        let userInfo: [String: Any] = [
          "distance": distanceCovered / 1000,
          "duration": Date().timeIntervalSince(startTime ?? Date()),
          "latitude": location.coordinate.latitude,
          "longitude": location.coordinate.longitude
        ]
        NotificationCenter.default.post(name: NSNotification.Name("tracking-update"), object: nil, userInfo: userInfo)
      }
    } else {
      walkedRoute.append(location)
    }
    
    self.lastLocation = location
  }
  
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    print("Location manager failed with error: \(error)")
  }
}
