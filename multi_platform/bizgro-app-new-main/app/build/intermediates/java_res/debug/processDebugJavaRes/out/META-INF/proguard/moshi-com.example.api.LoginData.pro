-keepnames class com.example.api.LoginData
-if class com.example.api.LoginData
-keep class com.example.api.LoginDataJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
