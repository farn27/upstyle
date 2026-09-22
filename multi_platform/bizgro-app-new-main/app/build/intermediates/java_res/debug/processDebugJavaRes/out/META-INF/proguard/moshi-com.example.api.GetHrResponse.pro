-keepnames class com.example.api.GetHrResponse
-if class com.example.api.GetHrResponse
-keep class com.example.api.GetHrResponseJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
