#pragma once
#include <windows.h>
#include <objidl.h>
#include <atomic>
#include <algorithm>
#include <cstring>
#include <mutex>
#include <vector>

// CapturePreview writes into this bounded stream, not an unbounded HGLOBAL.
// All retained bytes are the FIRST capture output; no fixture-color filtering.
class LimitedStream final : public IStream {
    std::atomic<ULONG> refs_{1};
    std::mutex mutex_;
    std::vector<unsigned char> bytes_;
    size_t cursor_ = 0;
    static constexpr size_t limit_ = 8'000'000;
public:
    HRESULT STDMETHODCALLTYPE QueryInterface(REFIID id, void** out) override {
        if (!out) return E_POINTER;
        *out = nullptr;
        if (id == IID_IUnknown || id == IID_IStream || id == IID_ISequentialStream) {
            *out = static_cast<IStream*>(this); AddRef(); return S_OK;
        }
        return E_NOINTERFACE;
    }
    ULONG STDMETHODCALLTYPE AddRef() override { return ++refs_; }
    ULONG STDMETHODCALLTYPE Release() override { const auto count = --refs_; if (!count) delete this; return count; }
    HRESULT STDMETHODCALLTYPE Read(void* target, ULONG count, ULONG* read) override {
        if (!target && count) return E_POINTER;
        std::lock_guard lock(mutex_);
        const size_t available = cursor_ < bytes_.size() ? bytes_.size() - cursor_ : 0;
        const auto n = std::min<size_t>(count, available);
        if (n) std::memcpy(target, bytes_.data() + cursor_, n);
        cursor_ += n; if (read) *read = static_cast<ULONG>(n);
        return n == count ? S_OK : S_FALSE;
    }
    HRESULT STDMETHODCALLTYPE Write(const void* source, ULONG count, ULONG* written) override {
        if (written) *written = 0;
        if (!source && count) return E_POINTER;
        std::lock_guard lock(mutex_);
        if (cursor_ > limit_ || count > limit_ - cursor_) return STG_E_MEDIUMFULL;
        try { if (cursor_ + count > bytes_.size()) bytes_.resize(cursor_ + count); }
        catch (...) { return E_OUTOFMEMORY; }
        if (count) std::memcpy(bytes_.data() + cursor_, source, count);
        cursor_ += count; if (written) *written = count; return S_OK;
    }
    HRESULT STDMETHODCALLTYPE Seek(LARGE_INTEGER delta, DWORD origin, ULARGE_INTEGER* result) override {
        std::lock_guard lock(mutex_);
        const auto base = origin == STREAM_SEEK_SET ? 0LL : origin == STREAM_SEEK_CUR ?
            static_cast<LONGLONG>(cursor_) : origin == STREAM_SEEK_END ? static_cast<LONGLONG>(bytes_.size()) : -1LL;
        if (base < 0 || delta.QuadPart < -base || delta.QuadPart > static_cast<LONGLONG>(limit_) - base) return STG_E_INVALIDFUNCTION;
        cursor_ = static_cast<size_t>(base + delta.QuadPart);
        if (result) result->QuadPart = cursor_; return S_OK;
    }
    HRESULT STDMETHODCALLTYPE SetSize(ULARGE_INTEGER size) override {
        std::lock_guard lock(mutex_); if (size.QuadPart > limit_) return STG_E_MEDIUMFULL;
        try { bytes_.resize(static_cast<size_t>(size.QuadPart)); }
        catch (...) { return E_OUTOFMEMORY; } return S_OK;
    }
    HRESULT STDMETHODCALLTYPE Stat(STATSTG* stat, DWORD) override {
        if (!stat) return E_POINTER;
        std::lock_guard lock(mutex_); *stat = {}; stat->type = STGTY_STREAM; stat->cbSize.QuadPart = bytes_.size(); return S_OK;
    }
    HRESULT STDMETHODCALLTYPE CopyTo(IStream*, ULARGE_INTEGER, ULARGE_INTEGER*, ULARGE_INTEGER*) override { return E_NOTIMPL; }
    HRESULT STDMETHODCALLTYPE Commit(DWORD) override { return S_OK; }
    HRESULT STDMETHODCALLTYPE Revert() override { return E_NOTIMPL; }
    HRESULT STDMETHODCALLTYPE LockRegion(ULARGE_INTEGER, ULARGE_INTEGER, DWORD) override { return STG_E_INVALIDFUNCTION; }
    HRESULT STDMETHODCALLTYPE UnlockRegion(ULARGE_INTEGER, ULARGE_INTEGER, DWORD) override { return STG_E_INVALIDFUNCTION; }
    HRESULT STDMETHODCALLTYPE Clone(IStream**) override { return E_NOTIMPL; }
    std::vector<unsigned char> snapshot() { std::lock_guard lock(mutex_); return bytes_; }
};
