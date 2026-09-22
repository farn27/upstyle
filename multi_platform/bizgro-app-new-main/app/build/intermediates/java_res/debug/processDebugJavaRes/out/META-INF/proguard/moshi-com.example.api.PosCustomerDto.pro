-keepnames class com.example.api.PosCustomerDto
-if class com.example.api.PosCustomerDto
-keep class com.example.api.PosCustomerDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
