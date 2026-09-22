-keepnames class com.example.api.PurchaseOrderDto
-if class com.example.api.PurchaseOrderDto
-keep class com.example.api.PurchaseOrderDtoJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
