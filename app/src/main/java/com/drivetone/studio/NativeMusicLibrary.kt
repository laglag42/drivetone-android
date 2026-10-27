package com.drivetone.studio

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import org.json.JSONArray
import org.json.JSONObject

/**
 * Stores only explicitly selected SAF document URIs. No READ_MEDIA_AUDIO grant needed.
 * The provider can revoke access or delete the file; callers must handle failures.
 */
class NativeMusicLibrary(private val ctx: Context) {
    private val preferences = ctx.getSharedPreferences("drivetone_library_v7", Context.MODE_PRIVATE)
    private val key = "tracks"
    data class Track(val uri: Uri, val title: String)

    fun all(): List<Track> {
        val saved = try { JSONArray(preferences.getString(key, "[]")) } catch (_: Exception) { JSONArray() }
        val out = ArrayList<Track>()
        for (i in 0 until minOf(saved.length(), 500)) {
            try {
                val record = saved.getJSONObject(i)
                val raw = record.getString("uri")
                val title = record.getString("title").take(220)
                val parsed = Uri.parse(raw)
                if (parsed.scheme == "content" && title.isNotBlank()) out.add(Track(parsed, title))
            } catch (_: Exception) {}
        }
        return out
    }

    private fun save(tracks: List<Track>) {
        val arr = JSONArray()
        tracks.take(500).forEach {
            arr.put(JSONObject().put("uri", it.uri.toString()).put("title", it.title))
        }
        preferences.edit().putString(key, arr.toString()).apply()
    }

    fun append(uri: Uri): Boolean {
        if (uri.scheme != "content") return false
        val tracks = all().toMutableList()
        if (tracks.any { it.uri == uri } || tracks.size >= 500) return false
        val title = displayName(uri) ?: "Bilinmeyen müzik"
        tracks.add(Track(uri, title))
        save(tracks)
        return true
    }

    private fun displayName(uri: Uri): String? {
        return try {
            ctx.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(0)?.take(220) else null
            }
        } catch (_: Exception) { null }
    }

    fun json(): String {
        val tracks = all()
        val arr = JSONArray()
        tracks.forEachIndexed { i, t ->
            arr.put(JSONObject().put("index", i).put("title", t.title).put("uri", t.uri.toString()))
        }
        return arr.toString()
    }

    fun remove(index: Int): Boolean {
        val tracks = all().toMutableList()
        if (index !in tracks.indices) return false
        tracks.removeAt(index)
        save(tracks)
        return true
    }

    fun clear() { save(emptyList()) }

    fun exists(index: Int): Boolean {
        val uri = all().getOrNull(index)?.uri ?: return false
        return try {
            ctx.contentResolver.openFileDescriptor(uri, "r")?.use { true } ?: false
        } catch (_: Exception) { false }
    }
}
