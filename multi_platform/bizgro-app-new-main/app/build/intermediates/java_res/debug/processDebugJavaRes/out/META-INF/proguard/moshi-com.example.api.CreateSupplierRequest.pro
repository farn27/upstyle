-keepnames class com.example.api.CreateSupplierRequest
-if class com.example.api.CreateSupplierRequest
-keep class com.example.api.CreateSupplierRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.CreateSupplierRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.CreateSupplierRequest {
    public synthetic <init>(java.lang.String,com.example.api.SupplierDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
