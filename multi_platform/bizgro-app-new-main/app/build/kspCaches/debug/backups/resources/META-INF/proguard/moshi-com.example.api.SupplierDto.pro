-keepnames class com.example.api.SupplierDto
-if class com.example.api.SupplierDto
-keep class com.example.api.SupplierDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
