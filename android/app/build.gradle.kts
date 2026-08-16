plugins {
    id("com.android.application")
}

android {
    namespace = "com.chuhaijian.deeptutor"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.chuhaijian.deeptutor"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "1.0.1"

        buildConfigField(
            "String",
            "DEFAULT_SERVER_URL",
            "\"https://www.chuhaijian.com/deeptutor\"",
        )
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.activity:activity:1.12.4")
}
