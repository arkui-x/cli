#import "Module_namePlugin.h"
#import <sys/utsname.h>
#import <UIKit/UIKit.h>

@implementation Module_namePlugin

+ (int)addWithA:(int)a b:(int)b {
    return a + b;
}

+ (void)logWithMsg:(NSString *)msg {
    NSLog(@"%@", msg);
}

+ (NSString *)getSystemVersion {
    return [[UIDevice currentDevice] systemVersion];
}

+ (NSString *)getFullOSName {
    return [NSString stringWithFormat:@"iOS %@", [[UIDevice currentDevice] systemVersion]];
}

+ (NSString *)getDeviceType {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString *model = [NSString stringWithCString:systemInfo.machine encoding:NSUTF8StringEncoding];
    if ([model hasPrefix:@"iPad"]) {
        return @"iPad";
    } else if ([model hasPrefix:@"iPhone"]) {
        return @"iPhone";
    }
    return model;
}

@end
