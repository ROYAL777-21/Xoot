package za.co.xoot.widgets;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class XootStatusWidgetProvider extends AppWidgetProvider {
  @Override
  public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
    for (int appWidgetId : appWidgetIds) {
      updateWidget(context, appWidgetManager, appWidgetId);
    }
  }

  private static void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
    int layoutId = resId(context, "layout", "xoot_status_widget");
    if (layoutId == 0) return;

    RemoteViews views = new RemoteViews(context.getPackageName(), layoutId);
    views.setTextViewText(resId(context, "id", "xoot_widget_star"), "*");
    views.setTextViewText(resId(context, "id", "xoot_widget_eyebrow"), "Xoot");
    views.setTextViewText(resId(context, "id", "xoot_widget_title"), "Next clean");
    views.setTextViewText(resId(context, "id", "xoot_widget_body"), "Open Xoot for live booking status.");
    views.setTextViewText(resId(context, "id", "xoot_widget_action"), "View in app");

    PendingIntent openApp = PendingIntent.getActivity(
      context,
      appWidgetId,
      new Intent(Intent.ACTION_VIEW, Uri.parse("xoot://bookings?intent=widget_next_booking"))
        .setPackage(context.getPackageName()),
      pendingIntentFlags()
    );
    views.setOnClickPendingIntent(resId(context, "id", "xoot_widget_root"), openApp);
    views.setOnClickPendingIntent(resId(context, "id", "xoot_widget_action"), openApp);

    appWidgetManager.updateAppWidget(appWidgetId, views);
  }

  private static int pendingIntentFlags() {
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    return flags;
  }

  private static int resId(Context context, String type, String name) {
    return context.getResources().getIdentifier(name, type, context.getPackageName());
  }
}
