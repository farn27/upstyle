-keepnames class com.example.api.AddDealRequest
-if class com.example.api.AddDealRequest
-keep class com.example.api.AddDealRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
