#import "AppDelegate.h"
#import <React/RCTBundleURLProvider.h>
#import <React/RCTLinkingManager.h>
#import <Firebase.h>
#import <FirebaseAppCheck/FirebaseAppCheck.h>
#import <FirebaseMessaging/FirebaseMessaging.h>
#import <GoogleMaps/GoogleMaps.h>
#import <React/RCTBridge.h>
#import <React/RCTEventDispatcher.h>
#import "RNSplashScreen.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"Novo";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};
  
  // Initialize Firebase
  [FIRApp configure];
  
  // Configure App Check
  FIRAppCheckDebugProviderFactory *providerFactory = [[FIRAppCheckDebugProviderFactory alloc] init];
  [FIRAppCheck setAppCheckProviderFactory:providerFactory];
  
  // Configure Google Maps
  [GMSServices provideAPIKey:@"AIzaSyAO6ofLvzQCrYxlIJR5CQTIStHkdlof4Qs"];
  
  // Set up notification handling
  if ([UNUserNotificationCenter class] != nil) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
    
    UNAuthorizationOptions options = UNAuthorizationOptionAlert | 
                                    UNAuthorizationOptionSound | 
                                    UNAuthorizationOptionBadge;
    
    [center requestAuthorizationWithOptions:options
                          completionHandler:^(BOOL granted, NSError * _Nullable error) {
      if (granted) {
        NSLog(@"Notification permission granted");
      } else {
        NSLog(@"Notification permission denied");
      }
    }];
  }
  
  [application registerForRemoteNotifications];
  [FIRMessaging messaging].delegate = self;
  
  BOOL result = [super application:application didFinishLaunchingWithOptions:launchOptions];
  
  // Show splash screen
  [RNSplashScreen show];
  
  return result;
}

// Handle deep linking
- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}

// Handle universal links
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
  return [RCTLinkingManager application:application
                   continueUserActivity:userActivity
                     restorationHandler:restorationHandler];
}

// Handle FCM token refresh
- (void)messaging:(FIRMessaging *)messaging didReceiveRegistrationToken:(NSString *)fcmToken {
  NSLog(@"FCM registration token: %@", fcmToken);
  
  // Send token to your server
  NSDictionary *dataDict = [NSDictionary dictionaryWithObject:fcmToken forKey:@"token"];
  [[NSNotificationCenter defaultCenter] postNotificationName:@"FCMToken" object:nil userInfo:dataDict];
}

// Handle notifications when app is in foreground
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler {
  NSDictionary *userInfo = notification.request.content.userInfo;
  
  // Check if notification is from Firebase
  if (userInfo[kFIRMessagingMessageIDKey]) {
    [[FIRMessaging messaging] appDidReceiveMessage:userInfo];
  }
  
  // Show the notification even when app is in foreground
  completionHandler(UNNotificationPresentationOptionBadge | UNNotificationPresentationOptionSound | UNNotificationPresentationOptionBanner);
}

// Handle notification tap
- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void(^)(void))completionHandler {
  NSDictionary *userInfo = response.notification.request.content.userInfo;
  
  // Check if notification is from Firebase
  if (userInfo[kFIRMessagingMessageIDKey]) {
    [[FIRMessaging messaging] appDidReceiveMessage:userInfo];
  }
  
  // Check if we need to open map screen
  if ([userInfo[@"openMap"] boolValue]) {
    dispatch_async(dispatch_get_main_queue(), ^{
      [[NSNotificationCenter defaultCenter] postNotificationName:@"openMapFromNotification" object:nil];
    });
  }
  
  completionHandler();
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
