/*
 * Copyright (c) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
 
#import "AppDelegate.h"
#import <libace_ios/Ace.h>

@implementation AppDelegate
@synthesize window = _window;

/**
 * Example ace view controller, which will load ArkUI-X ability instance.
 * AceViewController is provided by ArkUI-X
 *
 * @see <a href="https://gitee.com/arkui-crossplatform/doc/blob/master/contribute/tutorial/how-to-build-iOS-app.md">
 * to build ios library</a>
 */
- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions {
    
    AceViewController *controller = [[AceViewController alloc] initWithVersion:(ACE_VERSION) instanceName:@"entry_MainAbility"];
    self.window = [[UIWindow alloc] initWithFrame:[UIScreen mainScreen].bounds];
    self.window.backgroundColor = [UIColor whiteColor];
    self.window.rootViewController = controller;
    [self.window makeKeyAndVisible];
    
    return YES;
}
@end
