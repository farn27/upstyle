-keepnames class com.example.api.CreatePoRequest
-if class com.example.api.CreatePoRequest
-keep class com.example.api.CreatePoRequestJsonAdapter {
    public <init>(com.squareup.moshi.Moshi);
}
-if class com.example.api.CreatePoRequest
-keepnames class kotlin.jvm.internal.DefaultConstructorMarker
-keepclassmembers class com.example.api.CreatePoRequest {
    public synthetic <init>(java.lang.String,com.example.api.PurchaseOrderDto,int,kotlin.jvm.internal.DefaultConstructorMarker);
}
