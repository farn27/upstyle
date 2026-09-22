-keepnames class com.example.api.UserInfo
-if class com.example.api.UserInfo
-keep class com.example.api.UserInfoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
